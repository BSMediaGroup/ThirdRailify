import { Link } from "react-router-dom";
import { ArrowIcon, BoltIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";
import { policyDocuments, policyList, type PolicyKey, type PolicyLink } from "../content/policies";
import { usePrivacy } from "../privacy/PrivacyProvider";

export function PolicyPage({ policyKey }: { policyKey: PolicyKey }) {
  const policy = policyDocuments[policyKey];
  const privacy = usePrivacy();
  return (
    <div className={`policy-page policy-page--${policy.tone}`}>
      <section className="policy-hero" aria-labelledby="policy-title">
        <SignalField />
        <div className="policy-hero__lines" aria-hidden="true"><span /><span /><span /></div>
        <div className="container policy-hero__inner">
          <nav className="policy-breadcrumb" aria-label="Breadcrumb"><Link to="/policies">Policy library</Link><span>/</span><span aria-current="page">{policy.shortTitle}</span></nav>
          <div className="policy-hero__copy">
            <div>
              <p className="eyebrow"><i /> {policy.eyebrow}</p>
              <h1 id="policy-title">{policy.title}</h1>
              <p>{policy.summary}</p>
            </div>
            <dl className="policy-meta">
              <div><dt>Document</dt><dd>POL / {policy.order}</dd></div>
              <div><dt>Last updated</dt><dd>{policy.updated}</dd></div>
              <div><dt>Revision</dt><dd>{policy.revision}</dd></div>
              <div><dt>Length</dt><dd>{policy.readingTime}</dd></div>
            </dl>
          </div>
          <nav className="policy-highlights" aria-label={`${policy.shortTitle} key sections`}>
            {policy.highlights.map((highlight, index) => <a key={highlight.sectionId} href={`#${highlight.sectionId}`}><span>0{index + 1}</span><strong>{highlight.label}</strong><ArrowIcon /></a>)}
          </nav>
        </div>
      </section>

      <div className="container policy-layout">
        <aside className="policy-sidebar">
          <nav className="policy-toc" aria-label="On this page">
            <p>On this page</p>
            <ol>{policy.sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol>
          </nav>
          <nav className="policy-switcher" aria-label="Policy documents">
            <p>Document register</p>
            {policyList.map((entry) => <Link key={entry.key} to={entry.slug} aria-current={entry.key === policy.key ? "page" : undefined}>{entry.shortTitle}<span>{entry.order}</span></Link>)}
          </nav>
        </aside>

        <article className="policy-document">
          <div className="policy-document__notice"><BoltIcon /><p><strong>Plain-language policy</strong>This page is organised for scanning and deep linking. Section links can be copied directly from the address bar.</p></div>
          {policy.sections.map((section, index) => (
            <section className="policy-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><div><p>{section.eyebrow}</p><h2 id={`${section.id}-title`} tabIndex={-1}>{section.title}</h2></div><a href={`#${section.id}`} aria-label={`Copyable link to ${section.title}`}>#</a></header>
              <div className="policy-section__body">
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {section.table ? <PolicyTable table={section.table} /> : null}
                {section.note ? <div className="policy-note"><BoltIcon /><p>{section.note}</p></div> : null}
                {policy.key === "privacy" && section.id === "cookies-local-storage" ? <button className="button button--secondary policy-privacy-action" type="button" onClick={privacy.openManager}>Open Privacy choices</button> : null}
                {section.links ? <PolicyLinks links={section.links} /> : null}
              </div>
            </section>
          ))}
          <footer className="policy-document__footer">
            <div><p className="eyebrow">End of document</p><strong>Last updated {policy.updated}</strong></div>
            <div><Link className="button button--secondary" to="/policies">All policies</Link><a className="button button--primary" href="mailto:support@thirdrailify.com">Ask a question <ArrowIcon /></a></div>
          </footer>
        </article>
      </div>
    </div>
  );
}

function PolicyTable({ table }: { table: NonNullable<(typeof policyDocuments)[PolicyKey]["sections"][number]["table"]> }) {
  return <div className="policy-table-wrap" tabIndex={0} role="region" aria-label={table.caption}>
    <table className="policy-table">
      <caption>{table.caption}</caption>
      <thead><tr>{table.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
      <tbody>{table.rows.map((row) => <tr key={row.join("|")}>{row.map((cell, index) => index === 0 ? <th scope="row" key={cell}>{cell}</th> : <td key={cell}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function PolicyLinks({ links }: { links: PolicyLink[] }) {
  return <div className="policy-links">{links.map((link) => link.href.startsWith("/")
    ? <Link key={link.href} to={link.href}>{link.label}<ArrowIcon /></Link>
    : <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ArrowIcon /></a>)}</div>;
}
