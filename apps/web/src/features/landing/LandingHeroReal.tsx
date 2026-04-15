import { motion } from "framer-motion";
import { Button } from "../../components/common/Button";
import "./landing.css";

export function LandingHeroReal(){
  return (
    <div className="landing-root">
      <div className="landing-bg" />

      <motion.section
        className="landing-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="landing-title">Creators</h1>
        <p className="landing-sub">Connect • Stream • Earn</p>

        <div className="landing-actions">
          <Button>Get Started</Button>
          <Button variant="secondary">Explore</Button>
        </div>

        <div className="landing-stats">
          <div><span>10K+</span><p>Creators</p></div>
          <div><span>1M+</span><p>Views</p></div>
          <div><span>$</span><p>Earnings</p></div>
        </div>
      </motion.section>
    </div>
  );
}
