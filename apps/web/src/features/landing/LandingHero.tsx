import { motion } from "framer-motion";
import { Button } from "../../components/common/Button";

export function LandingHero(){
  return (
    <main style={{padding:40}}>
      <motion.h1 initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
        Creators Platform
      </motion.h1>
      <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>
        Connect • Stream • Earn
      </motion.p>
      <div style={{marginTop:20}}>
        <Button>Join</Button>
        <Button variant="secondary">Explore</Button>
      </div>
    </main>
  );
}
