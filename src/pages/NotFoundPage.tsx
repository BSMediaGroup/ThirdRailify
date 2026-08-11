import { Link } from "react-router-dom";
import { BoltIcon } from "../components/Icons";

export function NotFoundPage() {
  return (
    <section className="not-found">
      <div className="not-found__number" aria-hidden="true">404</div>
      <div className="container not-found__content"><BoltIcon /><p className="eyebrow">Signal lost</p><h1>This route left the rail.</h1><p>The page may still be waiting for migration, or the link may have taken a wrong turn.</p><div className="button-row"><Link className="button button--primary" to="/">Return home</Link><Link className="button button--secondary" to="/shop">Open the shop</Link></div></div>
    </section>
  );
}
