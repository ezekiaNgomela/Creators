import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function FeatureCard({
  action,
  body,
  icon,
  title,
  tone = "neutral",
}: {
  action?: string;
  body: string;
  icon: ReactNode;
  title: string;
  tone?: "neutral" | "coral" | "mint" | "ink";
}) {
  return (
    <motion.article
      className={`feature-card-v2 tone-${tone}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      viewport={{ once: true, margin: "-80px" }}
    >
      <span className="feature-card-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <small>{action}</small> : null}
    </motion.article>
  );
}
