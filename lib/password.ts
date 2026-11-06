/** Why a new password can't be used, or null if it's fine. */
export function passwordProblem(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  // Long inputs would make hashing needlessly slow.
  if (password.length > 200) return "Password must be under 200 characters.";
  return null;
}
