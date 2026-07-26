import { LegalLayout } from "@/features/legal/components/legal-layout";

const ISSUES_URL = "https://github.com/KacemMathlouthi/animus/issues";

export function TermsPage() {
  return (
    <LegalLayout lastUpdated="June 17, 2026" title="Terms of Service">
      <p>
        animus is a free, open-source project that turns a topic into a
        narrated, animated explainer video (the "Service"). It is built for fun
        and experimentation rather than as a commercial product. By using the
        Service, you agree to these terms. If you do not agree, please don't use
        it.
      </p>

      <h2>1. The Service</h2>
      <p>
        You describe a topic and the Service generates an explainer video from
        it. It is experimental: output is produced by automated systems and may
        be wrong, incomplete, or odd, so review it before relying on or sharing
        it. Features may change, and the Service may be unavailable, reset, or
        shut down at any time.
      </p>

      <h2>2. Open source</h2>
      <p>
        The code behind animus is open source on{" "}
        <a
          href="https://github.com/KacemMathlouthi/animus"
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>{" "}
        and is licensed under the terms in that repository. Those terms govern
        the code itself; this page covers your use of the hosted Service.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You can sign in with a magic link sent to your email, or with a GitHub
        or Google account. You are responsible for the inbox or account you use
        to sign in and for what happens under your account.
      </p>

      <h2>4. Be reasonable</h2>
      <p>This is a small project, so please use it considerately. Don't:</p>
      <ul>
        <li>
          create content that is illegal, infringing, or harmful to others;
        </li>
        <li>
          try to break, overload, or gain unauthorized access to the Service;
        </li>
        <li>or pass off generated output in deceptive or unlawful ways.</li>
      </ul>

      <h2>5. Your content and output</h2>
      <p>
        You keep ownership of the prompts and materials you submit, and of the
        videos the Service generates for you. The Service only uses what you
        submit in order to produce your output and keep things running. You are
        responsible for having the rights to whatever you put in.
      </p>

      <h2>6. No warranty</h2>
      <p>
        The Service is provided "as is", with no warranties of any kind. There
        is no guarantee that it will work, stay available, be accurate, or that
        anything you create will be preserved. Keep your own copies of anything
        you care about.
      </p>

      <h2>7. Liability</h2>
      <p>
        To the extent allowed by law, the maintainers are not liable for any
        damages or losses arising from your use of the Service. It's a hobby
        project, so use it at your own risk.
      </p>

      <h2>8. Changes</h2>
      <p>
        These terms may change as the project evolves. When they do, the "Last
        updated" date above will change. Continuing to use the Service means you
        accept the current version.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions or concerns? Open an issue on{" "}
        <a href={ISSUES_URL} rel="noreferrer" target="_blank">
          GitHub
        </a>
        .
      </p>
    </LegalLayout>
  );
}
