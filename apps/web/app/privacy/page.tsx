import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | edUOtaga",
  description: "How edUOtaga handles your data on the website and Android app.",
};

const LAST_UPDATED = "4 August 2026";
const CONTACT_EMAIL = "otaga2k25@gmail.com";
const CONTACT_WEBSITE = "otaga.in";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-8 text-base leading-relaxed">
        <section>
          <p>
            This policy explains how edUOtaga (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles information when you use
            the edUOtaga website at edu.otaga.in and the edUOtaga Android app. It applies to both unless
            stated otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Personal information we collect</h2>
          <p>
            <strong>We do not collect personal information.</strong> edUOtaga has no user accounts, no sign-up
            and no login. We do not ask for your name, email address, phone number or location, and we do not
            use advertising, analytics or tracking services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Information stored on your device</h2>
          <p className="mb-3">
            To make the app and website usable, we store a small amount of data locally on your own device. On
            the website this uses your browser&rsquo;s local storage; in the Android app it uses the app&rsquo;s
            private storage.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Experiments you save to My Lab</li>
            <li>The last experiment you opened, so you can continue where you left off</li>
            <li>Your light or dark theme preference (website)</li>
          </ul>
          <p className="mt-3">
            This data never leaves your device and is never sent to us or to anyone else. You can erase it at
            any time by clearing your browser data, or by clearing the app&rsquo;s storage or uninstalling the
            app.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Information handled automatically</h2>
          <p>
            When the app or website requests experiment content from our servers, our hosting provider
            processes standard technical information such as your IP address, device type and the time of the
            request. This is an ordinary part of delivering content over the internet, is used only to operate
            and secure the service, and is not used to identify you or build a profile.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Sharing your information</h2>
          <p>
            We do not sell, rent or share your information. Because we do not collect personal information,
            there is none to transfer to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Children&rsquo;s privacy</h2>
          <p>
            edUOtaga is an educational service intended for students, and may be used by children. As we do not
            collect personal information from any user, we do not knowingly collect personal information from
            children.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Your rights</h2>
          <p>
            All data created by your use of edUOtaga is stored on your own device and remains fully under your
            control. You can view, change or delete it at any time without contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Any changes will be posted on this page with a revised
            &ldquo;last updated&rdquo; date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Contact us</h2>
          <p className="mb-3">If you have questions about this policy, you can reach us at:</p>
          <ul className="list-none space-y-2">
            <li>
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              Website:{" "}
              <a
                href={`https://${CONTACT_WEBSITE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_WEBSITE}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
