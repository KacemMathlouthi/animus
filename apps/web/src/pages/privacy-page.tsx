import { LegalLayout } from "@/features/legal/components/legal-layout";

const PRIVACY_EMAIL = "privacy@tryanimus.app";

export function PrivacyPage() {
  return (
    <LegalLayout lastUpdated="July 26, 2026" title="Privacy Policy">
      <p>
        This page explains, in plain terms, what data animus holds when you use
        it, who else it passes through, and how to get it deleted. The short
        version: it collects what it needs to sign you in, generate your videos,
        and meter what that costs. It is not sold, and it is not used for
        advertising.
      </p>

      <h2>1. What it collects</h2>
      <ul>
        <li>
          <strong>Your email address</strong>, so you can sign in with a magic
          link.
        </li>
        <li>
          <strong>Basic profile information</strong> (name, avatar) if you sign
          in with GitHub or Google.
        </li>
        <li>
          <strong>Your conversations</strong> — the prompts you write, the
          agent's replies, and the code it writes to build your video. These are
          stored so you can come back to a conversation later.
        </li>
        <li>
          <strong>The videos it generates for you</strong>, stored as files so
          they can be played back and shared.
        </li>
        <li>
          <strong>Your own API keys, if you choose to add them.</strong> If you
          bring your own model or narration key, it is encrypted (AES-256-GCM)
          before it is stored, is never sent back to your browser, and is only
          ever shown to you as a provider name and last four characters. It is
          decrypted server-side solely to make the calls you asked for.
        </li>
        <li>
          <strong>Usage and credit records</strong> — per-turn token and
          narration counts and what they cost, so your balance is accurate.
        </li>
        <li>
          <strong>Technical logs and analytics</strong> — sign-in activity,
          errors, and aggregate page-performance data, used to keep the Service
          running.
        </li>
      </ul>

      <h2>2. How it's used</h2>
      <p>
        Your data is used to operate animus: to sign you in, to research and
        generate the videos you ask for, to store and play them back, to meter
        usage against your credit balance, and to debug problems. It is not
        sold, rented, or used for advertising, and it is not used to train
        anyone's models by us.
      </p>

      <h2>3. Services your data passes through</h2>
      <p>
        animus is built on third-party infrastructure. Each of these handles
        some of your data under its own privacy policy:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> — hosting for the website and API, plus
          privacy-friendly analytics and page-performance measurement.
        </li>
        <li>
          <strong>Neon</strong> — the Postgres database holding your account,
          conversations and usage records.
        </li>
        <li>
          <strong>Cloudflare R2</strong> — object storage for your rendered
          videos.
        </li>
        <li>
          <strong>Amazon Bedrock</strong> — runs the Claude model that powers
          the agent. Your prompts and conversation are sent to it to generate
          replies.
        </li>
        <li>
          <strong>Anthropic, OpenAI or Google</strong> — only if you bring your
          own model key, in which case your prompts go to that provider on your
          own account instead of through Bedrock.
        </li>
        <li>
          <strong>ElevenLabs</strong> — turns the narration script into speech.
          The narration text is sent to it.
        </li>
        <li>
          <strong>Daytona</strong> — the isolated cloud sandbox where your
          video's code is written and rendered.
        </li>
        <li>
          <strong>Exa</strong> — web search and page fetching, used when the
          agent researches your topic. Your search queries are sent to it.
        </li>
        <li>
          <strong>Braintrust</strong> — collects traces of the agent's model
          calls, which include prompt and response content, so quality and
          failures can be diagnosed.
        </li>
        <li>
          <strong>Resend</strong> — delivers magic-link sign-in emails.
        </li>
        <li>
          <strong>GitHub</strong> and <strong>Google</strong> — optional social
          sign-in.
        </li>
      </ul>
      <p>
        Please don't put confidential information, personal data about other
        people, or anything you can't share with the services above into a
        prompt.
      </p>

      <h2>4. Cookies</h2>
      <p>
        A session cookie keeps you signed in; the Service cannot work without
        it. Vercel Analytics and Speed Insights also run on every page. They are
        used to count visits and measure page performance in aggregate, not to
        build a profile of you or serve advertising.
      </p>

      <h2>5. Where it lives, and for how long</h2>
      <p>
        Account, conversation and usage records are stored in the database;
        rendered videos are stored in object storage and served through
        short-lived signed links. Data is held in the United States. Deleting a
        conversation deletes its messages and its rendered videos, and shuts
        down its sandbox. Usage and credit records are kept after that, because
        they are the record of what your balance was spent on.
      </p>
      <p>
        animus is a young product. Security is best-effort, and data may be
        reset as the Service changes — keep your own copy of anything you care
        about.
      </p>

      <h2>6. Videos you share</h2>
      <p>
        Publishing a video creates an unlisted public link. Anyone who has that
        link can watch and download the video without signing in, and it stays
        reachable until the conversation is deleted. Treat a share link as
        public.
      </p>

      <h2>7. Your choices and your rights</h2>
      <p>
        You can delete any conversation and its videos from the app at any time,
        and you can remove a stored API key from settings at any time. To get
        your account and its data deleted, or to ask for a copy of what is held
        about you, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{" "}
        from the address on your account. Depending on where you live you may
        also have rights to correct or object to the processing described here —
        the same address reaches us.
      </p>

      <h2>8. Children</h2>
      <p>
        animus isn't intended for children under 13, and accounts shouldn't be
        created for them.
      </p>

      <h2>9. Changes</h2>
      <p>
        This policy will change as the product does. When it does, the "Last
        updated" date above changes with it.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about privacy, or anything on this page:{" "}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
