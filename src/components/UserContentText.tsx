'use client';

import { useTranslatedUserContent } from '@/hooks/useTranslatedUserContent';
import { createElement, ElementType } from 'react';

type Props = {
  text: string;
  className?: string;
  as?: ElementType;
};

export default function UserContentText({ text, className, as = 'span' }: Props) {
  const display = useTranslatedUserContent(text);
  return createElement(as, { className }, display);
}

export { useTranslatedUserContent };
