import Link from "next/link";
import { mr } from "@/lib/i18n.ts";
import { ROLES } from "@/lib/users.ts";

export default function Signup({ searchParams }: { searchParams: { error?: string } }) {
  const err = searchParams.error ? mr.signupErrors[searchParams.error as keyof typeof mr.signupErrors] : null;
  return (
    <form className="card" action="/api/signup" method="post" style={{ maxWidth: 420, margin: "30px auto" }}>
      <h2>{mr.signup}</h2>
      {err && <p className="err">{err}</p>}
      <label htmlFor="n">{mr.fullName}</label>
      <input id="n" name="name" autoComplete="name" required minLength={2} />
      <label htmlFor="r">{mr.role}</label>
      <select id="r" name="role" required>
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label htmlFor="u">{mr.username}</label>
      <input id="u" name="username" autoComplete="username" required pattern="[a-zA-Z0-9_]{4,20}" />
      <small>{mr.usernameHint}</small>
      <label htmlFor="p">{mr.password}</label>
      <input id="p" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <small>{mr.passwordHint}</small>
      <p><button className="btn" type="submit">{mr.createAccount}</button></p>
      <p>{mr.haveAccount} <Link href="/login">{mr.login}</Link></p>
    </form>
  );
}
