'use client';

import { useCallback } from 'react';

// Onboarding is disabled in this fork: signed-in users land directly on `/`
// instead of being routed through the preference questionnaire.
export const useDesktopUserStateRedirect = () => useCallback(() => {}, []);

export const useWebUserStateRedirect = () => useCallback(() => {}, []);

export const useUserStateRedirect = () => useCallback(() => {}, []);
