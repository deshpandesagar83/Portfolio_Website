import type { WorkflowProject } from '../types';
import { portfoliowebsite } from './portfoliowebsite';

/** Every project shown on /workflow/, in display order.
 *
 *  Adding a project: create its module beside this file, import it above, and
 *  append it here. Nothing else changes — no component edits, no new route. */
export const projects: WorkflowProject[] = [portfoliowebsite];
