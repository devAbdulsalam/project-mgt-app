// The password rule, in one place.
//
// It has to match the server's (`MIN_PASSWORD_LENGTH` in the backend's
// auth/password.ts). When the two disagree the form accepts a password the API
// then rejects, and the person is corrected only after submitting.

import { z } from 'zod';
import { passwordStrength } from './password';

export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_HINT = `Use at least ${MIN_PASSWORD_LENGTH} characters with a mix of letters, numbers and symbols.`;

export const passwordField = z
	.string()
	.min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
	.max(256, 'That password is too long')
	.refine((p) => passwordStrength(p).score >= 2, 'Add a mix of letters and numbers');
