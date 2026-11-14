import json
import logging
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

from botocore.exceptions import ClientError, EndpointConnectionError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

# The Lambda reads KB_ID and builds boto3 clients at import time. Mock both for the import only,
# so nothing is left set in the environment and no region or credentials are needed.
with mock.patch.dict(os.environ, {"KB_ID": "test-kb-id"}), mock.patch("boto3.client"):
    import lambda_function  # noqa: E402
from responses import ChatResponse  # noqa: E402


def make_event(message="What is your name?"):
    return {"body": json.dumps({"message": message})}


def client_error(code, operation="Converse"):
    return ClientError({"Error": {"Code": code, "Message": "boom"}}, operation)


def converse_ok(text="I am a developer."):
    return {"output": {"message": {"content": [{"text": text}]}}}


def kb_ok(*texts):
    return {"retrievalResults": [{"content": {"text": t}} for t in (texts or ("chunk one",))]}


class LambdaTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        logging.disable(logging.CRITICAL)  # keep expected error tracebacks out of test output

    @classmethod
    def tearDownClass(cls):
        logging.disable(logging.NOTSET)

    def setUp(self):
        # Replace the real AWS clients so no test can reach the network or the account.
        kb_patch = mock.patch.object(lambda_function, "kb")
        bedrock_patch = mock.patch.object(lambda_function, "bedrock_client")
        self.kb = kb_patch.start()
        self.bedrock = bedrock_patch.start()
        self.addCleanup(kb_patch.stop)
        self.addCleanup(bedrock_patch.stop)
        self.kb.retrieve.return_value = kb_ok()
        self.bedrock.converse.return_value = converse_ok()

    def invoke(self, event):
        return lambda_function.lambda_handler(event, None)

    def assertResponse(self, result, expected):
        self.assertEqual(result["statusCode"], expected.status_code)
        self.assertEqual(json.loads(result["body"]), {"error": expected.message})
        self.assertEqual(result["headers"]["Content-Type"], "application/json")
        self.assertIn("Access-Control-Allow-Origin", result["headers"])

    def assertAwsNotCalled(self):
        self.kb.retrieve.assert_not_called()
        self.bedrock.converse.assert_not_called()


class SuccessTests(LambdaTestCase):
    def test_returns_200_with_answer(self):
        self.bedrock.converse.return_value = converse_ok("He builds backends.")
        result = self.invoke(make_event())

        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(json.loads(result["body"]), {"answer": "He builds backends."})

    def test_success_has_json_and_cors_headers(self):
        result = self.invoke(make_event())

        self.assertEqual(result["headers"]["Content-Type"], "application/json")
        self.assertEqual(
            result["headers"]["Access-Control-Allow-Origin"], lambda_function.ALLOWED_ORIGIN
        )

    def test_retrieves_from_configured_knowledge_base(self):
        self.invoke(make_event("Where did you work?"))

        kwargs = self.kb.retrieve.call_args.kwargs
        self.assertEqual(kwargs["knowledgeBaseId"], "test-kb-id")
        self.assertEqual(kwargs["retrievalQuery"], {"text": "Where did you work?"})

    def test_retrieved_chunks_are_passed_to_model_as_context(self):
        self.kb.retrieve.return_value = kb_ok("worked at Acme", "studied CS")
        self.invoke(make_event("Tell me about yourself"))

        kwargs = self.bedrock.converse.call_args.kwargs
        system_text = kwargs["system"][0]["text"]
        self.assertIn("worked at Acme", system_text)
        self.assertIn("studied CS", system_text)
        self.assertEqual(kwargs["modelId"], lambda_function.MODEL_ID)
        self.assertEqual(
            kwargs["messages"],
            [{"role": "user", "content": [{"text": "Tell me about yourself"}]}],
        )

    def test_surrounding_whitespace_is_stripped(self):
        self.invoke(make_event("   hello   "))

        self.assertEqual(self.kb.retrieve.call_args.kwargs["retrievalQuery"], {"text": "hello"})

    def test_message_at_exact_limit_is_accepted(self):
        result = self.invoke(make_event("a" * lambda_function.MAX_MESSAGE_LENGTH))

        self.assertEqual(result["statusCode"], 200)

    def test_no_retrieved_chunks_still_answers(self):
        self.kb.retrieve.return_value = {"retrievalResults": []}
        result = self.invoke(make_event())

        self.assertEqual(result["statusCode"], 200)
        self.bedrock.converse.assert_called_once()


class InvalidRequestTests(LambdaTestCase):
    def test_body_that_is_not_json(self):
        self.assertResponse(self.invoke({"body": "not json"}), ChatResponse.INVALID_JSON)
        self.assertAwsNotCalled()

    def test_body_that_is_not_a_json_object(self):
        for body in ("[]", "null", "123", '"hello"', "true"):
            with self.subTest(body=body):
                self.assertResponse(self.invoke({"body": body}), ChatResponse.INVALID_JSON)
        self.assertAwsNotCalled()

    def test_body_that_is_not_a_string(self):
        # e.g. the console Test tab with an already-parsed dict as body
        self.assertResponse(self.invoke({"body": {"message": "hi"}}), ChatResponse.INVALID_JSON)
        self.assertAwsNotCalled()

    def test_missing_message(self):
        for event in ({}, {"body": None}, {"body": ""}, {"body": "{}"}, {"body": '{"other": 1}'}):
            with self.subTest(event=event):
                self.assertResponse(self.invoke(event), ChatResponse.MISSING_MESSAGE)
        self.assertAwsNotCalled()

    def test_blank_or_non_string_message(self):
        for message in ("", "   ", "\n\t", None, 123, ["hi"], {"a": 1}):
            with self.subTest(message=message):
                self.assertResponse(self.invoke(make_event(message)), ChatResponse.MISSING_MESSAGE)
        self.assertAwsNotCalled()

    def test_message_too_long(self):
        too_long = "a" * (lambda_function.MAX_MESSAGE_LENGTH + 1)

        self.assertResponse(self.invoke(make_event(too_long)), ChatResponse.MESSAGE_TOO_LONG)
        self.assertAwsNotCalled()

    def test_padding_whitespace_does_not_count_toward_limit(self):
        padded = "  " + "a" * lambda_function.MAX_MESSAGE_LENGTH + "  "

        self.assertEqual(self.invoke(make_event(padded))["statusCode"], 200)


class AwsFailureTests(LambdaTestCase):
    def test_throttling_returns_429(self):
        for code in ("ThrottlingException", "TooManyRequestsException"):
            for service in ("kb", "bedrock"):
                with self.subTest(code=code, service=service):
                    self.setUp()
                    target = self.kb.retrieve if service == "kb" else self.bedrock.converse
                    target.side_effect = client_error(code)

                    self.assertResponse(self.invoke(make_event()), ChatResponse.MODEL_THROTTLED)

    def test_unavailable_errors_return_503(self):
        for code in (
            "ServiceUnavailableException",
            "InternalServerException",
            "ModelNotReadyException",
            "ModelTimeoutException",
        ):
            with self.subTest(code=code):
                self.bedrock.converse.side_effect = client_error(code)

                self.assertResponse(self.invoke(make_event()), ChatResponse.UPSTREAM_UNAVAILABLE)

    def test_knowledge_base_unavailable_returns_503(self):
        self.kb.retrieve.side_effect = client_error("ServiceUnavailableException", "Retrieve")

        self.assertResponse(self.invoke(make_event()), ChatResponse.UPSTREAM_UNAVAILABLE)
        self.bedrock.converse.assert_not_called()

    def test_connection_error_returns_503(self):
        self.kb.retrieve.side_effect = EndpointConnectionError(endpoint_url="https://example.invalid")

        self.assertResponse(self.invoke(make_event()), ChatResponse.UPSTREAM_UNAVAILABLE)

    def test_other_aws_errors_return_500(self):
        for code in ("AccessDeniedException", "ValidationException", "ResourceNotFoundException"):
            with self.subTest(code=code):
                self.bedrock.converse.side_effect = client_error(code)

                self.assertResponse(self.invoke(make_event()), ChatResponse.INTERNAL_ERROR)

    def test_unexpected_exception_returns_500(self):
        self.kb.retrieve.side_effect = RuntimeError("something odd")

        self.assertResponse(self.invoke(make_event()), ChatResponse.INTERNAL_ERROR)

    def test_malformed_model_response_returns_500(self):
        for bad in ({}, {"output": {}}, {"output": {"message": {"content": []}}}):
            with self.subTest(response=bad):
                self.bedrock.converse.return_value = bad

                self.assertResponse(self.invoke(make_event()), ChatResponse.INTERNAL_ERROR)

    def test_internal_error_details_never_reach_client(self):
        self.bedrock.converse.side_effect = client_error("AccessDeniedException")
        result = self.invoke(make_event())

        self.assertNotIn("AccessDenied", result["body"])
        self.assertNotIn("boom", result["body"])


if __name__ == "__main__":
    unittest.main()
