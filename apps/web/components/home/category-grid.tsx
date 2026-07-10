'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Card } from '@eduotaga/ui/web';
import { CATEGORY_LIST } from '@eduotaga/constants';

export function CategoryGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('[data-category-card]');
    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06 },
    );
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {CATEGORY_LIST.map((category) => (
        <Link key={category.id} href={`/subjects?categoryId=${category.id}`} data-category-card>
          <Card className="flex flex-col items-center gap-2 p-5 text-center">
            <span className="text-2xl" aria-hidden="true">
              🔬
            </span>
            <span className="text-sm font-medium text-foreground">{category.name}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
