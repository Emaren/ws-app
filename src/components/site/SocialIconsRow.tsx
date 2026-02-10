// src/components/site/SocialIconsRow.tsx
type Props = {
    facebookUrl?: string;
    discordUrl?: string;
    email?: string; // mailto:
  };
  
  function IconWrap({ children, href, label }: { children: React.ReactNode; href: string; label: string }) {
    return (
      <a
        href={href}
        aria-label={label}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800
                   bg-black/5 dark:bg-white/5 transition hover:bg-black/10 dark:hover:bg-white/10
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        {children}
      </a>
    );
  }
  
  export default function SocialIconsRow({
    facebookUrl = "https://www.facebook.com/",
    discordUrl = "https://discord.com/invite/",
    email = "mailto:tony@wheatandstone.ca",
  }: Props) {
    return (
      <section className="ws-container">
        <div className="ws-article">
          <div className="flex items-center justify-center gap-4 md:gap-6 py-3">
            {/* Facebook */}
            <IconWrap href={facebookUrl} label="Facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.62.77-1.62 1.56v1.87h2.76l-.44 2.91h-2.32v7.03C18.34 21.21 22 17.06 22 12.06z"/>
              </svg>
            </IconWrap>
  
            {/* Discord */}
            <IconWrap href={discordUrl} label="Discord">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.22 4.24A17.44 17.44 0 0 0 15.9 3l-.2.39c1.48.36 2.54.88 3.36 1.47-1.42-.71-2.8-1.14-4.08-1.31a13.3 13.3 0 0 0-4 0C9.7 3.72 8.32 4.15 6.9 4.86c.82-.59 1.88-1.11 3.36-1.47L10.06 3a17.44 17.44 0 0 0-4.32 1.24C3.24 7.37 2.56 10.4 2.7 13.4c1.8 1.34 3.54 2.16 5.24 2.7l.52-.8c-.9-.33-1.74-.77-2.52-1.3.2.14 1.74.9 4.02 1.25 1.32.2 2.7.2 4.02 0 2.28-.35 3.82-1.11 4.02-1.25-.78.53-1.62.97-2.52 1.3l.52.8c1.7-.54 3.44-1.36 5.24-2.7.2-3-.54-6.03-2.8-9.16ZM9.6 12.9c-.67 0-1.22-.6-1.22-1.34 0-.73.55-1.33 1.22-1.33s1.22.6 1.22 1.33c0 .74-.55 1.34-1.22 1.34Zm4.8 0c-.67 0-1.22-.6-1.22-1.34 0-.73.55-1.33 1.22-1.33s1.22.6 1.22 1.33c0 .74-.55 1.34-1.22 1.34Z"/>
              </svg>
            </IconWrap>
  
            {/* Email */}
            <IconWrap href={email} label="Email">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/>
              </svg>
            </IconWrap>
          </div>
        </div>
      </section>
    );
  }
  
