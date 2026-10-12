import { z } from "zod";

const catalogEntrySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(80),
    title: z.string().min(1).max(180),
    publisher: z.string().min(1).max(120),
    url: z.string().url().startsWith("https://"),
    language: z.literal("English"),
    format: z.enum(["article", "course", "textbook", "video"]),
    accessConditions: z.string().min(1).max(300),
    checkedAt: z.literal("2026-10-12"),
    relevance: z.string().min(1).max(400),
    matchTerms: z.array(z.string().min(2).max(80)).min(1).max(20),
  })
  .strict();

export type ResourceCatalogEntry = z.infer<typeof catalogEntrySchema>;

const catalogSchema = z
  .array(catalogEntrySchema)
  .superRefine((entries, context) => {
    for (const field of ["id", "url"] as const) {
      const values = entries.map((entry) => entry[field]);
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          message: `Resource catalog ${field}s must be unique`,
        });
    }
  });

export const resourceCatalog = catalogSchema.parse([
  {
    id: "openlearn-project-management",
    title: "Project management: the start of the project journey",
    publisher: "The Open University — OpenLearn",
    url: "https://www.open.edu/openlearn/money-business/leadership-management/project-management-the-start-the-project-journey/content-section-overview",
    language: "English",
    format: "course",
    accessConditions:
      "Free to read without an account. A free account is optional for progress tracking, quizzes and a statement of participation.",
    checkedAt: "2026-10-12",
    relevance:
      "Introduces project planning, feasibility, risk, decision making, project life cycles and the project manager’s role.",
    matchTerms: [
      "project management",
      "project manager",
      "project planning",
      "project life cycle",
      "feasibility study",
    ],
  },
  {
    id: "openlearn-critical-reader",
    title: "How to be a critical reader",
    publisher: "The Open University — OpenLearn",
    url: "https://www.open.edu/openlearn/languages/english-language/how-be-critical-reader",
    language: "English",
    format: "course",
    accessConditions:
      "Free course content. A free account is requested for enrolment, progress tracking and participation awards.",
    checkedAt: "2026-10-12",
    relevance:
      "Explains how to assess arguments, distinguish facts from opinions and examine evidence supporting claims.",
    matchTerms: [
      "critical analysis",
      "critical thinking",
      "critical reading",
      "evidence based reasoning",
      "evaluate arguments",
    ],
  },
  {
    id: "crash-course-what-is-statistics",
    title: "What Is Statistics: Crash Course Statistics #1",
    publisher: "CrashCourse",
    url: "https://www.youtube.com/watch?v=sxQaBpKfDRk",
    language: "English",
    format: "video",
    accessConditions:
      "Free to watch on YouTube without paid access. YouTube may show advertisements and offer optional sign-in features.",
    checkedAt: "2026-10-12",
    relevance:
      "Introduces statistical reasoning, data literacy and how statistics helps answer questions with data.",
    matchTerms: [
      "what is statistics",
      "statistical reasoning",
      "data literacy",
    ],
  },
  {
    id: "openstax-introductory-statistics",
    title: "Introductory Statistics 2e",
    publisher: "OpenStax",
    url: "https://openstax.org/details/books/introductory-statistics-2e",
    language: "English",
    format: "textbook",
    accessConditions:
      "Free web textbook and download. No paid access is required; optional OpenStax services may require an account.",
    checkedAt: "2026-10-12",
    relevance:
      "Covers descriptive statistics, probability, distributions, sampling, confidence intervals, hypothesis tests and regression.",
    matchTerms: [
      "statistics",
      "probability distribution",
      "probability theory",
      "hypothesis testing",
      "confidence interval",
      "standard deviation",
      "linear regression",
    ],
  },
  {
    id: "openstax-algebra-trigonometry",
    title: "Algebra and Trigonometry 2e",
    publisher: "OpenStax",
    url: "https://openstax.org/details/books/algebra-and-trigonometry-2e",
    language: "English",
    format: "textbook",
    accessConditions:
      "Free web textbook and download. No paid access is required; optional OpenStax services may require an account.",
    checkedAt: "2026-10-12",
    relevance:
      "Provides worked explanations of equations, functions, graphs, polynomial and exponential models, and trigonometry.",
    matchTerms: [
      "algebra",
      "trigonometry",
      "linear equation",
      "quadratic equation",
      "polynomial",
      "exponential function",
    ],
  },
  {
    id: "mdn-javascript-guide",
    title: "JavaScript Guide",
    publisher: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    language: "English",
    format: "article",
    accessConditions:
      "Free to read without an account. No paid access is required.",
    checkedAt: "2026-10-12",
    relevance:
      "A structured guide to JavaScript syntax, types, control flow, functions, objects, classes, promises and modules.",
    matchTerms: [
      "javascript",
      "java script",
      "programming fundamentals",
      "control flow",
    ],
  },
]);
