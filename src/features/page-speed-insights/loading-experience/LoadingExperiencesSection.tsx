import { LoadingExperience } from './LoadingExperience';

const loadingExperiences = [
  { title: 'Page Loading Experience', experienceKey: 'loadingExperience' },
  {
    title: 'Origin Loading Experience',
    experienceKey: 'originLoadingExperience',
  },
] as const;

export function LoadingExperiencesSection() {
  return (
    <>
      {loadingExperiences.map(({ title, experienceKey }) => (
        <LoadingExperience
          key={experienceKey}
          title={title}
          experienceKey={experienceKey}
        />
      ))}
    </>
  );
}
