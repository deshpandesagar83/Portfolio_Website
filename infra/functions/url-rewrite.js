// CloudFront Function (viewer-request): maps clean URLs onto the index.html files
// that `next build` emits (trailingSlash: true), because the S3 REST origin does not.
//   /          -> /index.html          (also covered by DefaultRootObject)
//   /workflow/ -> /workflow/index.html
//   /workflow  -> /workflow/index.html
// URIs whose last segment has a dot (/_next/static/app.js, /icon.svg) pass through.
// Deployed by create_cloudfront.sh, which passes this file to cloudfront.yaml as a parameter.
// Keep it under 4096 bytes (CloudFormation parameter limit) and ASCII only.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    request.uri = uri + '/index.html';
  }

  return request;
}
