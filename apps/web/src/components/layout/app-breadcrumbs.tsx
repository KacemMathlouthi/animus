import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type AppBreadcrumbSegment = {
  title: string;
  href?: string;
};

export function AppBreadcrumbs({
  segments,
}: {
  segments?: AppBreadcrumbSegment[];
}) {
  if (!segments?.length) {
    return null;
  }

  return (
    <Breadcrumb className="min-w-0">
      {/* nowrap + truncate: the header is a fixed h-14, so a long conversation
			    title must ellipsize rather than wrap and spill past the border. */}
      <BreadcrumbList className="flex-nowrap">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <Fragment key={segment.title}>
              <BreadcrumbItem className="min-w-0">
                {isLast || !segment.href ? (
                  <BreadcrumbPage className="truncate">
                    {segment.title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink className="truncate" href={segment.href}>
                    {segment.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
