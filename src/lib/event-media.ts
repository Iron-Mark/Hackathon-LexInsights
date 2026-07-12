// Single source of truth for the CodeKada 2025 (2025-11-08) event media.
// Imported by the EventGallery UI component and by the JSON-LD builders in
// ./seo.ts, so captions/alt text never drift between the page and its schema.

export type EventGalleryImage = {
  src: string
  /** Objective description of the frame for screen readers and ImageObject.description. */
  alt: string
  /** Short human caption shown in the lightbox and used as ImageObject.caption. */
  caption: string
}

// Ordered chronologically by capture time.
export const EVENT_GALLERY: EventGalleryImage[] = [
  {
    src: '/gallery/codekada-01.jpg',
    alt: 'CODEKADA "The Innovation Hackathon" title screen projected at the venue, with the DevKada and KMC logos.',
    caption: 'Opening of CODEKADA: The Innovation Hackathon, by DevKada with KMC.',
  },
  {
    src: '/gallery/codekada-02.jpg',
    alt: 'Team members standing with paper plates and forks during a food break, laptops open on the table.',
    caption: 'A fuel break between build sprints.',
  },
  {
    src: '/gallery/codekada-03.jpg',
    alt: 'Team members heads-down on laptops with food on the table at the workspace beside the glass atrium.',
    caption: 'The team still building LexInsights while eating at the KMC | Proworking and Virtual Office Space.',
  },
  {
    src: '/gallery/codekada-04.jpg',
    alt: 'Pitch slide reading "The Solution: LexInSight, AI Compliance Assistant" projected on screen.',
    caption: 'Pitching the solution live demo, LexInsights: an AI compliance assistant.',
  },
  {
    src: '/gallery/codekada-05.jpg',
    alt: 'The team posing with thumbs up in front of a "UMak CCIS Student Council" slide.',
    caption: '2 UMak CCIS teams representing at the CodeKada 2025 Hackathon event.',
  },
  {
    src: '/gallery/codekada-06.jpg',
    alt: 'Large group photo of the CODEKADA participants holding DevKada banners under the venue’s ring-light ceiling.',
    caption: 'Closing group shot with the CODEKADA participants.',
  },
]

// Descriptive metadata for the CodeKada 2025 pitch/demo recording (hosted on
// Google Drive). The URL itself lives in ./seo.ts as DEMO_VIDEO_URL.
export const DEMO_VIDEO = {
  name: 'LexInsights pitch and demo at CodeKada 2025',
  description:
    'The LexInsights team presenting their Philippine legal compliance assistant during DevKada CodeKada 2025, hosted at KMC.',
  uploadDate: '2025-11-08',
  thumbnail: '/gallery/codekada-01.jpg',
}
