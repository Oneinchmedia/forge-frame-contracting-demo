'use client';

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

type IconName = 'plan' | 'hammer' | 'tile' | 'outdoor' | 'home' | 'scope';
const asset = (name: string) => `/assets/${name}`;

const services: { number: string; title: string; description: string; icon: IconName }[] = [
  { number: '01', title: 'Home Remodeling', description: 'Thoughtful renovations that make the everyday feel more considered.', icon: 'plan' },
  { number: '02', title: 'Kitchen Renovations', description: 'Better flow, durable finishes, and a room built around how you live.', icon: 'hammer' },
  { number: '03', title: 'Bathroom Renovations', description: 'Clean, calm, highly functional spaces with lasting craftsmanship.', icon: 'tile' },
  { number: '04', title: 'Decks & Outdoor Living', description: 'Outdoor rooms that extend your home into the seasons you love.', icon: 'outdoor' },
  { number: '05', title: 'Exterior Improvements', description: 'Purposeful updates that protect your home and sharpen its presence.', icon: 'home' },
  { number: '06', title: 'General Contracting', description: 'A steady hand across the full build, from first sketch to final walk-through.', icon: 'scope' },
];

const projects = [
  { category: 'Kitchen renovation', title: 'Modern Kitchen Renovation', location: 'Winchester, Virginia', image: asset('03-kitchen-after.png'), imageAlt: 'Bright modern kitchen with wood cabinetry and a central island', size: 'project-card--large' },
  { category: 'Bathroom transformation', title: 'Quietly Refined Bath', location: 'Northern Virginia', image: asset('06-bathroom-after.png'), imageAlt: 'Freshly renovated bathroom with a tiled shower and warm wood vanity', size: 'project-card--tall' },
  { category: 'Outdoor living', title: 'Covered Outdoor Living', location: 'Shenandoah Valley', image: asset('07-deck-finished-wide.png'), imageAlt: 'Finished wood deck with a covered outdoor living area and mountain view', size: 'project-card--wide' },
];

const processSteps = [
  ['01', 'Consultation', "We discuss your home's goals, space, timeline, and priorities."],
  ['02', 'Detailed Estimate', 'You receive a clear scope and a transparent project estimate.'],
  ['03', 'Build', 'We build with care and keep communication open throughout construction.'],
  ['04', 'Final Walkthrough', 'We review the finished work together before calling it complete.'],
];

const testimonials = [
  { quote: 'The whole project felt calm and organized. We always knew what was happening next, and the finished kitchen is better than we pictured.', name: 'Maya R.', context: 'Kitchen renovation · demo testimonial' },
  { quote: 'They paid attention to the details that make a space feel finished. Our deck finally feels like a real part of our home.', name: 'Daniel & Priya S.', context: 'Outdoor living · demo testimonial' },
  { quote: 'Straightforward, thoughtful, and easy to work with. The bathroom feels like us now—simple, warm, and built to last.', name: 'Alex T.', context: 'Bathroom renovation · demo testimonial' },
];

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <a className={`brand-lockup${dark ? ' brand-lockup--dark' : ''}`} href="#top" aria-label="Forge & Frame Contracting Co. home">
      <span className="brand-mark" aria-hidden="true"><span>F</span><span>F</span></span>
      <span className="brand-words"><strong>FORGE <i>&amp;</i> FRAME</strong><small>CONTRACTING CO.</small></span>
    </a>
  );
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`reveal ${visible ? 'reveal--visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}>{children}</div>;
}

function ServiceIcon({ name }: { name: IconName }) {
  const glyphs: Record<IconName, string> = { plan: '⌗', hammer: '╱', tile: '⊞', outdoor: '⌂', home: '⌁', scope: '＋' };
  return <span className={`service-icon service-icon--${name}`} aria-hidden="true">{glyphs[name]}</span>;
}

function Arrow({ className = '' }: { className?: string }) {
  return <span className={`arrow ${className}`} aria-hidden="true">↗</span>;
}

function BeforeAfterSlider({ before, after, beforeAlt, afterAlt, title }: { before: string; after: string; beforeAlt: string; afterAlt: string; title: string }) {
  const [position, setPosition] = useState(52);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const next = ((event.clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, next)));
  };
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event);
  };

  return (
    <div className="comparison">
      <div ref={frameRef} className={`comparison-frame${dragging ? ' is-dragging' : ''}`} onPointerDown={handlePointerDown} onPointerMove={(event) => dragging && setFromPointer(event)} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); setPosition((value) => Math.max(4, value - 4)); }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); setPosition((value) => Math.min(96, value + 4)); }
        if (event.key === 'Home') setPosition(4);
        if (event.key === 'End') setPosition(96);
      }} role="slider" tabIndex={0} aria-label={`${title} before and after comparison`} aria-valuemin={4} aria-valuemax={96} aria-valuenow={Math.round(position)} aria-valuetext={`${Math.round(position)} percent before image shown`}>
        <img className="comparison-image" src={after} alt={afterAlt} draggable={false} />
        <div className="comparison-before" style={{ width: `${position}%` }}><img className="comparison-image" src={before} alt={beforeAlt} draggable={false} /></div>
        <span className="comparison-label comparison-label--before">BEFORE</span><span className="comparison-label comparison-label--after">AFTER</span>
        <span className="comparison-handle" style={{ left: `${position}%` }} aria-hidden="true"><span className="comparison-grip"><i /><i /><i /></span></span>
      </div>
      <p className="comparison-hint"><span>←</span> Drag to compare <span>→</span></p>
    </div>
  );
}

function EstimateModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialFocusRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubmitted(true); };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="estimate-modal" role="dialog" aria-modal="true" aria-labelledby="estimate-title">
        <button className="modal-close" type="button" aria-label="Close estimate form" onClick={onClose}>×</button>
        {!submitted ? <>
          <div className="modal-intro"><p className="eyebrow eyebrow--red">LET&apos;S TALK ABOUT YOUR PROJECT</p><h2 id="estimate-title">Start with a clear next step.</h2><p>This is a frontend-only demo form. Share a few details and we&apos;ll show you what a thoughtful estimate experience could feel like.</p></div>
          <form className="estimate-form" onSubmit={handleSubmit}>
            <div className="form-grid form-grid--two"><label><span>Name <b>*</b></span><input ref={initialFocusRef} name="name" required placeholder="Your name" /></label><label><span>Email <b>*</b></span><input type="email" name="email" required placeholder="you@example.com" /></label></div>
            <div className="form-grid form-grid--two"><label><span>Phone</span><input type="tel" name="phone" placeholder="(555) 000-0000" /></label><label><span>Project type <b>*</b></span><select name="projectType" required defaultValue=""><option value="" disabled>Select one</option><option>Kitchen</option><option>Bathroom</option><option>Deck / Outdoor Living</option><option>Whole Home Remodel</option><option>Exterior</option><option>Other</option></select></label></div>
            <label><span>Project location <b>*</b></span><input name="location" required placeholder="City or neighborhood" /></label>
            <div className="form-grid form-grid--two"><label><span>Approximate budget</span><select name="budget" defaultValue=""><option value="" disabled>Select a range</option><option>Under $25,000</option><option>$25,000–$50,000</option><option>$50,000–$100,000</option><option>$100,000–$200,000</option><option>$200,000+</option><option>Not sure yet</option></select></label><label><span>Desired timeline</span><select name="timeline" defaultValue=""><option value="" disabled>Select a timeframe</option><option>As soon as possible</option><option>Within 3 months</option><option>3–6 months</option><option>6–12 months</option><option>Just exploring</option></select></label></div>
            <label><span>Tell us about your project <b>*</b></span><textarea name="project" required rows={4} placeholder="What are you hoping to build or change?" /></label>
            <div className="form-submit-row"><p>Demo functionality — no information is transmitted.</p><button className="button button--red" type="submit">Send project details <Arrow /></button></div>
          </form>
        </> : <div className="modal-success"><span className="success-mark">✓</span><p className="eyebrow eyebrow--red">THANKS FOR SHARING</p><h2>That&apos;s a strong place to start.</h2><p>Your project details have been captured in this demo experience. In a live site, this is where the team would follow up with a thoughtful next step.</p><button className="button button--navy" type="button" onClick={onClose}>Back to the site <Arrow /></button></div>}
      </div>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown); return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);
  const openModal = () => { setMenuOpen(false); setModalOpen(true); };

  return (
    <main id="top">
      <div className="utility-bar"><div className="container utility-inner"><span>RESIDENTIAL REMODELING &amp; OUTDOOR LIVING</span><span className="utility-location">SHENANDOAH VALLEY <i /> NORTHERN VIRGINIA</span></div></div>
      <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}><div className="container nav-wrap"><Logo /><nav className={`main-nav${menuOpen ? ' main-nav--open' : ''}`} id="main-navigation" aria-label="Main navigation"><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#projects" onClick={() => setMenuOpen(false)}>Projects</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#process" onClick={() => setMenuOpen(false)}>Process</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a><button className="button button--red nav-cta" type="button" onClick={openModal}>Get a Free Estimate <Arrow /></button></nav><button className={`menu-toggle${menuOpen ? ' menu-toggle--open' : ''}`} type="button" aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((open) => !open)}><span /><span /></button></div></header>

      <section className="hero" aria-labelledby="hero-title"><img className="hero-image" src={asset('01-forge-frame-hero-exterior.png')} alt="Crafted residential exterior at sunset" /><div className="hero-overlay" /><div className="container hero-content"><Reveal className="hero-copy"><p className="eyebrow eyebrow--light">CRAFTED WITH PURPOSE. BUILT TO LAST.</p><h1 id="hero-title">Building better spaces <em>from the ground up.</em></h1><p className="hero-lede">Residential remodeling, renovations, and outdoor living—built with craftsmanship, thoughtful planning, and straightforward communication.</p><div className="hero-actions"><button className="button button--red" type="button" onClick={openModal}>Get a Free Estimate <Arrow /></button><a className="text-link text-link--light" href="#projects">View our work <Arrow /></a></div><div className="trust-line"><span className="trust-dot" /> Licensed <i /> Insured <i /> Local</div></Reveal><div className="hero-stamp" aria-hidden="true"><span>FF</span><b>Residential<br />craft, considered</b><i /></div></div><a className="scroll-cue" href="#services" aria-label="Scroll to services"><span>Scroll to explore</span><i /></a></section>

      <section className="intro-section section-pad"><div className="container intro-grid"><Reveal><p className="eyebrow">01 / THE WORK</p></Reveal><Reveal className="intro-copy" delay={100}><h2>Good work begins with <em>good listening.</em></h2><p>Every home has a different rhythm. We take the time to understand what yours needs, then bring the right plan, people, and materials together to make it feel more like you.</p><a className="text-link" href="#about">Why Forge &amp; Frame <Arrow /></a></Reveal><Reveal className="intro-aside" delay={160}><span>“</span><p>Thoughtful construction for the way you actually live.</p></Reveal></div></section>

      <section className="services-section section-pad" id="services"><div className="container"><Reveal className="section-heading-row"><div><p className="eyebrow">02 / WHAT WE DO</p><h2>Built around <em>your life.</em></h2></div><p className="section-heading-note">From the first sketch to the final screw, we bring a steady process and a sharp eye to every detail.</p></Reveal><div className="services-grid">{services.map((service, index) => <Reveal key={service.number} delay={index * 70}><article className="service-card"><div className="service-top"><span className="service-number">{service.number}</span><ServiceIcon name={service.icon} /></div><h3>{service.title}</h3><p>{service.description}</p><a href="#contact" aria-label={`Learn more about ${service.title}`}><Arrow /></a></article></Reveal>)}</div></div></section>

      <section className="projects-section section-pad" id="projects"><div className="container"><Reveal className="section-heading-row projects-heading"><div><p className="eyebrow">03 / SELECTED WORK</p><h2>Made to be <em>lived in.</em></h2></div><p className="section-heading-note">A few fictional projects from our portfolio of renovations, additions, and outdoor spaces.</p></Reveal><div className="projects-grid">{projects.map((project, index) => <Reveal key={project.title} className={project.size} delay={index * 110}><article className="project-card"><div className="project-image-wrap"><img src={project.image} alt={project.imageAlt} /><div className="project-image-shade" /><span className="project-arrow"><Arrow /></span></div><div className="project-meta"><p>{project.category}</p><h3>{project.title}</h3><span>{project.location}</span></div></article></Reveal>)}</div><p className="demo-note">Portfolio projects shown for demonstration purposes.</p></div></section>

      <section className="comparisons-section section-pad"><div className="container"><Reveal className="section-heading-row comparisons-heading"><div><p className="eyebrow">04 / THE DIFFERENCE</p><h2>See the <em>transformation.</em></h2></div><p className="section-heading-note">Slide through a couple of matched before-and-after moments. The details are where a house starts to feel like home.</p></Reveal><div className="comparison-grid"><Reveal><BeforeAfterSlider title="Kitchen renovation" before={asset('02-kitchen-before.png')} after={asset('03-kitchen-after.png')} beforeAlt="Kitchen before renovation" afterAlt="Kitchen after renovation" /></Reveal><Reveal delay={120}><BeforeAfterSlider title="Bathroom renovation" before={asset('05-bathroom-before.png')} after={asset('06-bathroom-after.png')} beforeAlt="Bathroom before renovation" afterAlt="Bathroom after renovation" /></Reveal></div></div></section>

      <section className="values-section" id="about"><div className="values-image"><img src={asset('09-contractor-working.png')} alt="Contractor working carefully on a residential renovation" /></div><div className="values-content section-pad"><Reveal><p className="eyebrow eyebrow--red">05 / WHY FORGE &amp; FRAME</p><h2>Craftsmanship you can <em>feel.</em></h2><p className="values-lede">The best builds are not just well made—they are well managed. We keep the process grounded, the details intentional, and your home treated with respect from day one.</p><div className="values-list"><div><span>01</span><h3>Quality craftsmanship</h3><p>Durable materials. Precise work. Details that hold up to real life.</p></div><div><span>02</span><h3>Straightforward communication</h3><p>Clear updates, honest answers, and no guessing where things stand.</p></div><div><span>03</span><h3>Reliable scheduling</h3><p>A considered plan that keeps your project moving forward.</p></div><div><span>04</span><h3>Respect for your home</h3><p>Clean job sites, careful decisions, and pride in the work we leave behind.</p></div></div></Reveal></div></section>

      <section className="process-section section-pad" id="process"><div className="container"><Reveal className="section-heading-row"><div><p className="eyebrow">06 / HOW IT WORKS</p><h2>A process with <em>purpose.</em></h2></div><p className="section-heading-note">You should never have to wonder what happens next. Here is how we take an idea from first conversation to finished space.</p></Reveal><div className="process-grid">{processSteps.map(([number, title, description], index) => <Reveal key={number} delay={index * 90}><article className="process-step"><span className="process-number">{number}</span><div className="process-connector" /><h3>{title}</h3><p>{description}</p></article></Reveal>)}</div></div></section>

      <section className="about-section section-pad"><div className="container about-grid"><Reveal className="about-image-wrap"><img src={asset('10-forge-frame-crew.png')} alt="Forge and Frame crew gathered outside a finished home" /><span>Local by design.</span></Reveal><Reveal className="about-copy" delay={120}><p className="eyebrow eyebrow--red">07 / THE PEOPLE</p><h2>Small enough to care. <em>Experienced enough to deliver.</em></h2><p>Forge &amp; Frame is a fictional, locally focused residential contractor created for this portfolio demonstration. Our point of view is simple: take pride in the work, communicate like a human, and build relationships that last longer than the project.</p><a className="text-link" href="#contact">Start a conversation <Arrow /></a><p className="inline-disclaimer">Demo company content · No real services are offered</p></Reveal></div></section>

      <section className="testimonials-section section-pad"><div className="container"><Reveal className="section-heading-row"><div><p className="eyebrow">08 / KIND WORDS</p><h2>Good work gets <em>remembered.</em></h2></div><span className="demo-badge">DEMO TESTIMONIALS</span></Reveal><div className="testimonials-grid">{testimonials.map((testimonial, index) => <Reveal key={testimonial.name} delay={index * 90}><figure className="testimonial"><span className="quote-mark">“</span><blockquote>{testimonial.quote}</blockquote><figcaption><strong>{testimonial.name}</strong><span>{testimonial.context}</span></figcaption></figure></Reveal>)}</div></div></section>

      <section className="cta-section" id="contact"><div className="cta-ruler" aria-hidden="true" /><div className="container cta-inner"><Reveal><p className="eyebrow eyebrow--light">09 / YOUR NEXT PROJECT</p><h2>Ready to build something <em>better?</em></h2><p>Tell us a little about your renovation, addition, or outdoor space. We&apos;ll start with a clear conversation.</p><button className="button button--red" type="button" onClick={openModal}>Get a Free Estimate <Arrow /></button></Reveal><span className="cta-watermark" aria-hidden="true">FF</span></div></section>

      <footer className="site-footer"><div className="container footer-top"><div className="footer-brand"><Logo dark /><p>Residential remodeling &amp; outdoor living for the Shenandoah Valley and Northern Virginia.</p><p className="footer-disclaimer">Portfolio demonstration website. Forge &amp; Frame Contracting Co. is a fictional brand created to showcase web design and development.</p></div><div className="footer-column"><h3>Explore</h3><a href="#services">Services</a><a href="#projects">Projects</a><a href="#about">About</a><a href="#process">Process</a><a href="#contact">Contact</a></div><div className="footer-column"><h3>Services</h3><a href="#services">Home remodeling</a><a href="#services">Kitchen renovations</a><a href="#services">Bathroom renovations</a><a href="#services">Decks &amp; outdoor living</a><a href="#services">General contracting</a></div><div className="footer-column"><h3>Say hello</h3><a href="mailto:hello@forgeandframe.demo">hello@forgeandframe.demo</a><a href="tel:+15405550184">(540) 555-0184</a><span>Winchester, VA<br />&amp; surrounding areas</span><div className="socials"><a href="#contact" aria-label="Instagram placeholder">ig</a><a href="#contact" aria-label="Facebook placeholder">fb</a><a href="#contact" aria-label="Houzz placeholder">hz</a></div></div></div><div className="container footer-bottom"><span>© 2026 Forge &amp; Frame Contracting Co. · Demo content</span><span>Crafted with purpose.</span></div></footer>

      {modalOpen && <EstimateModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}
