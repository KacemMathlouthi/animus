import {
  GraduationCapIcon,
  type LucideIcon,
  MicIcon,
  PresentationIcon,
  SparklesIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { DecorIcon } from "@/components/decor-icon";
import { cn } from "@/lib/utils";

type UseCase = {
  name: string;
  prompt: string;
  icon: LucideIcon;
  decor?: React.ReactNode;
};

/* Each audience is introduced by the prompt they'd actually type — the card
   demos the product while it names who it's for. */
const data: UseCase[] = [
  {
    name: "Students",
    prompt: "Explain eigenvalues like I'm seeing them for the first time.",
    icon: GraduationCapIcon,
  },
  {
    name: "Teachers",
    prompt: "Make a 3-minute intro to photosynthesis for my class.",
    icon: PresentationIcon,
    decor: <DecorIcon position="bottom-left" />,
  },
  {
    name: "The endlessly curious",
    prompt: "Why do mirrors flip left and right but not up and down?",
    icon: SparklesIcon,
  },
  {
    name: "Researchers",
    prompt: "Turn my paper's core result into a 2-minute explainer.",
    icon: MicIcon,
  },
  {
    name: "Creators",
    prompt: "Animate how gradient descent finds a minimum.",
    icon: VideoIcon,
  },
  {
    name: "Teams",
    prompt: "Explain our caching architecture to new engineers.",
    icon: UsersIcon,
    decor: <DecorIcon position="top-left" />,
  },
];

export function UseCases() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto mb-14 space-y-3 text-center">
        <h2 className="mx-auto max-w-xl text-balance font-medium text-xl tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
          Made for anyone who'd rather understand
        </h2>
        <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed md:text-lg">
          If you can ask the question, animus can turn the answer into something
          you'll actually remember.
        </p>
      </div>

      <div className="relative mx-auto max-w-5xl border">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 md:grid-cols-3">
          {data.map((item) => (
            <UseCaseCard key={item.name} useCase={item}>
              {item.decor}
            </UseCaseCard>
          ))}
        </div>
        <DecorIcon position="top-left" />
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />
        <DecorIcon position="bottom-right" />
      </div>
    </section>
  );
}

function UseCaseCard({
  useCase,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  useCase: UseCase;
}) {
  const Icon = useCase.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 bg-background p-5 text-start md:p-6",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.5]">
          <Icon />
        </div>
        <h3 className="font-medium text-foreground text-sm">{useCase.name}</h3>
      </div>
      <p className="text-pretty font-medium text-foreground/90 leading-snug md:text-lg">
        &ldquo;{useCase.prompt}&rdquo;
      </p>
      {children}
    </div>
  );
}
