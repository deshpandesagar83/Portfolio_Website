import { describe, it, expect } from 'vitest';
import { siteContent } from './site';
import { workflowContent } from './workflow';

describe('workflowContent', () => {
  it('has at least one project', () => {
    expect(workflowContent.projects.length).toBeGreaterThan(0);
  });

  it('gives every project a unique, URL-safe slug', () => {
    const slugs = workflowContent.projects.map((project) => project.slug);

    for (const slug of slugs) {
      expect(slug, `"${slug}" must be lowercase letters, digits, and hyphens only`).toMatch(
        /^[a-z0-9-]+$/,
      );
    }

    expect(new Set(slugs).size, 'two projects share a slug, so one anchor is unreachable').toBe(
      slugs.length,
    );

    for (const slug of slugs) {
      expect(
        slug,
        `project slug "${slug}" collides with the id of the page's own <Section id="workflow"> ` +
          `in app/workflow/page.tsx — /workflow/#workflow would resolve to the section, not the panel`,
      ).not.toBe('workflow');
    }
  });

  it('gives every project a name and at least one block', () => {
    for (const project of workflowContent.projects) {
      expect(project.name.trim(), `project "${project.slug}" has no name`).not.toBe('');
      expect(project.body.length, `project "${project.slug}" has an empty body`).toBeGreaterThan(0);
    }
  });

  it('gives every steps block at least one non-blank item', () => {
    for (const project of workflowContent.projects) {
      for (const block of project.body) {
        if (block.kind !== 'steps') continue;
        expect(block.items.length, `a steps block in "${project.slug}" is empty`).toBeGreaterThan(0);
        for (const item of block.items) {
          expect(item.trim(), `a step in "${project.slug}" is blank`).not.toBe('');
        }
      }
    }
  });

  it('gives every para and note block non-blank text', () => {
    for (const project of workflowContent.projects) {
      for (const block of project.body) {
        if (block.kind === 'steps') continue;
        expect(block.text.trim(), `a ${block.kind} block in "${project.slug}" is blank`).not.toBe('');
      }
    }
  });

  it('keeps the workflow page metadata distinct and non-empty', () => {
    // Two pages shipping an identical <title> is an SEO own-goal.
    expect(workflowContent.meta.title).not.toBe(siteContent.meta.title);
    expect(workflowContent.meta.title.trim()).not.toBe('');
    expect(workflowContent.meta.description.trim()).not.toBe('');
    expect(workflowContent.heading.trim()).not.toBe('');
  });
});
