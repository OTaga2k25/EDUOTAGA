'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { buttonLinkClassName } from '@eduotaga/ui/web';
import { SITE_DESCRIPTION, SITE_NAME } from '@eduotaga/constants';

export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
      >
        Free & open-source virtual laboratory
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl"
      >
        Learn science by doing it, not just reading it.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-xl text-lg text-muted"
      >
        {SITE_NAME} lets students run interactive physics, chemistry, biology, electronics,
        mechanical, and mathematics experiments — free, in the browser, and on mobile.
        {' '}
        <span className="sr-only">{SITE_DESCRIPTION}</span>
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <Link href="/subjects" className={buttonLinkClassName('primary', 'lg')}>
          Browse subjects
        </Link>
        <Link href="/experiments" className={buttonLinkClassName('secondary', 'lg')}>
          Explore experiments
        </Link>
      </motion.div>
    </section>
  );
}
