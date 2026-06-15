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
		<Breadcrumb>
			<BreadcrumbList>
				{segments.map((segment, index) => {
					const isLast = index === segments.length - 1;
					return (
						<Fragment key={segment.title}>
							<BreadcrumbItem>
								{isLast || !segment.href ? (
									<BreadcrumbPage>{segment.title}</BreadcrumbPage>
								) : (
									<BreadcrumbLink href={segment.href}>
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
