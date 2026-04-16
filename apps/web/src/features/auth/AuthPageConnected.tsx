import { useState } from "react";
import { motion } from "framer-motion";
import "./auth.css";
import { login, register } from "../../services/local-service/authService";

export function AuthPageConnected({ onSuccess, onBack }: { onSuccess: () => void; onBack?: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async () => {
  try {
    if (mode === "login") {
      await login({ email, password });
    } else {
      await register({ email, password, username });
    }
    onSuccess();
  } catch (e) {
    console.error(e);
  }
};
  return (
    <div className="auth-root">
      <div className="auth-left">
        <button className="text-link" onClick={onBack}>← Back</button>
        <h1>Creators</h1>
        <p>Stream • Connect • Earn</p>
      </div>

      <motion.div className="auth-card" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
        <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
        <input placeholder="Email" />
        <input placeholder="Password" type="password" />
        {mode === "register" && <input placeholder="Username" />}
        <button className="primary-btn" onClick={onSuccess}>
          {mode === "login" ? "Login" : "Register"}
        </button>
        <div className="divider">OR</div>
        <button className="oauth google" onClick={onSuccess}>Continue with Google</button>
        <button className="oauth github" onClick={onSuccess}>Continue with GitHub</button>
        <p className="switch">
          {mode === "login" ? "No account?" : "Already have an account?"}
          <span onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? " Register" : " Login"}</span>
        </p>
      </motion.div>
    </div>
  );
}
