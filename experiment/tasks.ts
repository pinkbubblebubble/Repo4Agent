export interface ExperimentTask {
  id: string;
  name: string;
  prompt: string;
}

export const TASKS: ExperimentTask[] = [
  {
    id: 'task-a',
    name: 'Add Feature: PATCH email endpoint',
    prompt:
      'Add a new PATCH /users/:id/email endpoint that updates only the email field. The endpoint should require authentication.',
  },
  {
    id: 'task-b',
    name: 'Fix Bug: Sessions not invalidated on delete',
    prompt:
      "There's a security bug: when a user is deleted, their active sessions are not invalidated. Fix this so that deleting a user also removes all their sessions.",
  },
  {
    id: 'task-c',
    name: 'Add Middleware: Input validation',
    prompt:
      'Add input validation to the POST /users endpoint. Validate that email is a valid email format and password is at least 8 characters. Return 400 with descriptive error messages if validation fails.',
  },
];
