// src/components/LoginForm.jsx
export default function LoginForm() {
  return (
    <div className="p-4">
      <h2>Login</h2>
      <form>
        <input placeholder="Email" />
        <input placeholder="Password" type="password" />
        <button type="button">Sign in</button>
      </form>
    </div>
  );
}