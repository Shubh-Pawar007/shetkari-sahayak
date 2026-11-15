import { mr } from "@/lib/i18n.ts";

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <form className="card" action="/api/login" method="post" style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>{mr.login}</h2>
      {searchParams.error && <p className="err">{mr.wrongLogin}</p>}
      <label htmlFor="u">{mr.username}</label>
      <input id="u" name="username" autoComplete="username" required />
      <label htmlFor="p">{mr.password}</label>
      <input id="p" name="password" type="password" autoComplete="current-password" required />
      <p><button className="btn" type="submit">{mr.login}</button></p>
    </form>
  );
}
