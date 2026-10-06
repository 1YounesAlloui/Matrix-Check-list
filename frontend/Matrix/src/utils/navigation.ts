import { router } from 'expo-router';

export const safeGoBack = (fallback: string = '/(tabs)/plans') => {
  if (router.canGoBack()) {
    router.back();
  } else {
    // Type assertion for arbitrary route fallback on Web
    (router.replace as (href: string) => void)(fallback);
  }
};
