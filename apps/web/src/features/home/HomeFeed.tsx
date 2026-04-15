import { motion } from "framer-motion";
import "./home.css";

const mockPosts = [
  { id: 1, creator: "John", views: "12K", live: true },
  { id: 2, creator: "Sarah", views: "8K" },
];

export function HomeFeed() {
  return (
    <div className="home-root">
      <div className="stories">
        {[1,2,3,4,5].map(s => (
          <div key={s} className="story" />
        ))}
      </div>

      <div className="feed">
        {mockPosts.map(post => (
          <motion.div
            key={post.id}
            className="post"
            initial={{opacity:0,y:40}}
            animate={{opacity:1,y:0}}
          >
            <div className="video-placeholder">
              {post.live && <span className="live-badge">LIVE</span>}
            </div>

            <div className="meta">
              <h4>{post.creator}</h4>
              <p>{post.views} views</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bottom-nav">
        <span>🏠</span>
        <span>🔍</span>
        <span>➕</span>
        <span>💬</span>
        <span>👤</span>
      </div>
    </div>
  );
}
