import { LoginForm } from "./login-form";

type LoginQuery = Record<string, string | string[] | undefined>;

function first(value: LoginQuery[string]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginQuery> }) {
  const { registered, confirmed, newUser } = await searchParams;
  return (
    <LoginForm
      registered={Boolean(first(registered))}
      confirmed={Boolean(first(confirmed))}
      newUser={first(newUser) === "true"}
    />
  );
}
