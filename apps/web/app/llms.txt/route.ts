import { DIFFICULTY_LABELS, SITE_DESCRIPTION, SITE_NAME } from '@eduotaga/constants';
import { getExperiments, getSubjects } from '@/lib/data';
import { absoluteUrl } from '@/lib/seo';

/**
 * /llms.txt — a curated, plain-markdown map of the site for large language
 * models (see llmstxt.org). Where robots.txt says what a crawler may fetch
 * and sitemap.xml lists every URL, this explains what the content *is*, so a
 * model answering a question can pick the right page without scraping the
 * whole site and parsing our React output.
 *
 * Generated from the same JSON that drives the pages, so adding an
 * experiment updates it automatically — nothing here is hand-maintained.
 */
export const dynamic = 'force-static';

function line(label: string, url: string, description: string) {
  return `- [${label}](${absoluteUrl(url)}): ${description}`;
}

export async function GET() {
  const [subjects, experiments] = await Promise.all([getSubjects(), getExperiments()]);

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));

  const experimentLines = experiments.map((experiment) => {
    const subject = subjectsById.get(experiment.subjectId);
    const facts = [
      subject ? `Subject: ${subject.name}` : null,
      `Level: ${DIFFICULTY_LABELS[experiment.difficulty]}`,
      experiment.estimatedDurationMinutes
        ? `~${experiment.estimatedDurationMinutes} min`
        : null,
      experiment.tags.length ? `Topics: ${experiment.tags.join(', ')}` : null,
    ].filter(Boolean);

    return line(
      experiment.title,
      `/experiments/${experiment.slug}`,
      `${experiment.summary} (${facts.join('. ')}.)`,
    );
  });

  const subjectLines = subjects.map((subject) => {
    const count = experiments.filter((experiment) => experiment.subjectId === subject.id).length;
    return line(
      subject.name,
      `/subjects/${subject.slug}`,
      `${subject.description} ${count} experiment${count === 1 ? '' : 's'}.`,
    );
  });

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free, open-source virtual laboratory. Every experiment is an
interactive simulation that runs in the browser, paired with the underlying
theory, a step-by-step procedure, expected observations, and a short quiz. No
account, payment, or physical equipment is required.

The same experiments ship in the ${SITE_NAME} Android app. URLs under
/experiments/ and /subjects/ open the matching screen in the app on devices
where it is installed, via verified Android App Links.

## Experiments

${experimentLines.join('\n')}

## Subjects

${subjectLines.join('\n')}

## Browse

${line('All experiments', '/experiments', 'Every experiment, grouped by discipline and subject. Filterable by category and difficulty.')}
${line('All subjects', '/subjects', 'Every subject, grouped into the eight lab disciplines.')}

## Optional

${line('Help', '/help', 'Support and troubleshooting for the website and Android app.')}
${line('Privacy policy', '/privacy', `How ${SITE_NAME} handles user data on the web and in the Android app.`)}
`;

  return new Response(body, {
    headers: {
      // text/plain (not text/markdown) so it renders in a browser tab
      // instead of prompting a download.
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
