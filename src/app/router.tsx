import { createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect, Outlet, type SearchSchemaInput } from '@tanstack/react-router';
import { z } from 'zod';
import { useAuthStore } from '@/shared/lib/auth-store';
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage';
import { NotFoundPage } from '@/features/system/NotFoundPage';
import { RouteFallback } from '@/features/system/RouteFallback';
import { ticketSearchSchema, type TicketSearch } from '@/features/tickets/model/filters';
import { inboxSearchSchema, type InboxSearch } from '@/features/inbox/model';
import { projectsSearchSchema, boardSearchSchema } from '@/features/projects/model';
import { notificationsSearchSchema } from '@/features/notifications/model';
import { teamSearchSchema } from '@/features/team/model';
import { dashboardSearchSchema, type DashboardSearch } from '@/features/dashboard/model';
import { clientsSearchSchema, clientDetailSearchSchema } from '@/features/clients/model';
import { assetsSearchSchema } from '@/features/assets/model';
import { visitsSearchSchema } from '@/features/visits/model';
import { kbSearchSchema } from '@/features/kb/model';
import { reportsSearchSchema } from '@/features/reports/model';

// Route-level code splitting: each page is its own chunk.
const LoginPage = lazyRouteComponent(() => import('@/features/auth/pages/LoginPage'), 'LoginPage');
const LoginOtpPage = lazyRouteComponent(() => import('@/features/auth/pages/LoginOtpPage'), 'LoginOtpPage');
const SignupPage = lazyRouteComponent(() => import('@/features/auth/pages/SignupPage'), 'SignupPage');
const SignupVerifyPage = lazyRouteComponent(() => import('@/features/auth/pages/SignupVerifyPage'), 'SignupVerifyPage');
const SignupWorkspacePage = lazyRouteComponent(() => import('@/features/auth/pages/SignupWorkspacePage'), 'SignupWorkspacePage');
const SignupTeamPage = lazyRouteComponent(() => import('@/features/auth/pages/SignupTeamPage'), 'SignupTeamPage');
const ForgotPasswordPage = lazyRouteComponent(() => import('@/features/auth/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyRouteComponent(() => import('@/features/auth/pages/ResetPasswordPage'), 'ResetPasswordPage');
const DashboardPage = lazyRouteComponent(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage');
const TicketsPage = lazyRouteComponent(() => import('@/features/tickets/pages/TicketsPage'), 'TicketsPage');
const TicketDetailRoute = lazyRouteComponent(() => import('@/features/tickets/pages/TicketDetailRoute'), 'TicketDetailRoute');
const CreateTicketRoute = lazyRouteComponent(() => import('@/features/tickets/pages/CreateTicketRoute'), 'CreateTicketRoute');
const MyWorkPage = lazyRouteComponent(() => import('@/features/inbox/pages/MyWorkPage'), 'MyWorkPage');
const ProjectsPage = lazyRouteComponent(() => import('@/features/projects/pages/ProjectsPage'), 'ProjectsPage');
const ProjectLayout = lazyRouteComponent(() => import('@/features/projects/pages/ProjectLayout'), 'ProjectLayout');
const ProjectOverviewPage = lazyRouteComponent(() => import('@/features/projects/pages/ProjectOverviewPage'), 'ProjectOverviewPage');
const ProjectListPage = lazyRouteComponent(() => import('@/features/projects/pages/ProjectListPage'), 'ProjectListPage');
const ProjectBoardPage = lazyRouteComponent(() => import('@/features/projects/pages/ProjectBoardPage'), 'ProjectBoardPage');
const ProjectStubTab = lazyRouteComponent(() => import('@/features/projects/pages/ProjectStubTab'), 'ProjectStubTab');
const NotificationsPage = lazyRouteComponent(() => import('@/features/notifications/pages/NotificationsPage'), 'NotificationsPage');
const TeamPage = lazyRouteComponent(() => import('@/features/team/pages/TeamPage'), 'TeamPage');
const RolesPage = lazyRouteComponent(() => import('@/features/team/pages/RolesPage'), 'RolesPage');
const BoardsPage = lazyRouteComponent(() => import('@/features/boards/BoardsPage'), 'BoardsPage');
const ClientsPage = lazyRouteComponent(() => import('@/features/clients/pages/ClientsPage'), 'ClientsPage');
const ClientDetailPage = lazyRouteComponent(() => import('@/features/clients/pages/ClientDetailPage'), 'ClientDetailPage');
const AssetsPage = lazyRouteComponent(() => import('@/features/assets/AssetsPage'), 'AssetsPage');
const VisitsPage = lazyRouteComponent(() => import('@/features/visits/VisitsPage'), 'VisitsPage');
const KbPage = lazyRouteComponent(() => import('@/features/kb/KbPages'), 'KbPage');
const KbArticlePage = lazyRouteComponent(() => import('@/features/kb/KbPages'), 'KbArticlePage');
const ReportsPage = lazyRouteComponent(() => import('@/features/reports/ReportsPage'), 'ReportsPage');
const SettingsPage = lazyRouteComponent(() => import('@/features/settings/SettingsPage'), 'SettingsPage');

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFoundPage, pendingComponent: RouteFallback });

const redirectSearch = z.object({ redirect: z.string().optional() });

// ---------- Public / auth ----------

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	beforeLoad: () => {
		const { status, org } = useAuthStore.getState();
		if (status === 'authenticated' && org) throw redirect({ to: '/$org/dashboard', params: { org: org.slug }, search: {} });
		throw redirect({ to: '/login', search: {} });
	},
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	validateSearch: redirectSearch,
	beforeLoad: ({ search }) => {
		const { status, org } = useAuthStore.getState();
		if (status === 'authenticated' && org) throw redirect({ to: search.redirect ?? '/$org/dashboard', params: { org: org.slug }, search: {} });
	},
	component: LoginPage,
});
const loginOtpRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login/verify', validateSearch: redirectSearch, component: LoginOtpPage });
const signupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/signup', component: SignupPage });
const signupVerifyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/signup/verify', component: SignupVerifyPage });
const signupWorkspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/signup/workspace', component: SignupWorkspacePage });
const signupTeamRoute = createRoute({ getParentRoute: () => rootRoute, path: '/signup/team', component: SignupTeamPage });
const forgotRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forgot-password', component: ForgotPasswordPage });
const resetRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reset-password/$token', component: ResetPasswordPage });

/**
 * Dev-only QA helper (no-op in production builds).
 *   /dev/login-as                       → signed in as the default demo user, on the dashboard
 *   /dev/login-as?email=…&to=/x/tickets → signed in as that demo user, on a given page
 *   /dev/login-as?stage=otp             → stops at the login OTP step
 *   /dev/login-as?stage=workspace|team  → seeds a signup draft and opens that signup step
 */
const devLoginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/dev/login-as',
	validateSearch: z.object({ email: z.string().optional(), to: z.string().optional(), stage: z.enum(['otp', 'verify', 'workspace', 'team']).optional() }),
	beforeLoad: async ({ search }) => {
		if (!import.meta.env.DEV) throw redirect({ to: '/login', search: {} });
		const store = useAuthStore.getState();
		if (search.stage === 'verify' || search.stage === 'workspace' || search.stage === 'team') {
			store.updateSignup({ firstName: 'Adaeze', lastName: 'Okonkwo', email: 'adaeze@kolanutsystems.ng', phone: '+234 803 555 0142', phoneVerified: search.stage !== 'verify', companyName: 'Kolanut Systems Ltd', slug: 'kolanut' });
			throw redirect({ to: `/signup/${search.stage}` as '/signup/verify', replace: true });
		}
		await store.login({ email: search.email ?? 'adaeze@kolanutsystems.ng', password: 'password', remember: true });
		if (search.stage === 'otp') throw redirect({ to: '/login/verify', search: {}, replace: true });
		const org = await store.verifyOtp('482913');
		throw redirect({ to: search.to ?? '/$org/dashboard', params: { org: org.slug }, replace: true, search: {} });
	},
});

// ---------- Authenticated ----------

const authedRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: 'authed',
	beforeLoad: ({ location }) => {
		const { status, org } = useAuthStore.getState();
		if (status !== 'authenticated' || !org) throw redirect({ to: '/login', search: { redirect: location.href } });
	},
	component: Outlet,
});

const orgRoute = createRoute({
	getParentRoute: () => authedRoute,
	path: '/$org',
	beforeLoad: ({ params }) => {
		const { org, availableOrgs, switchOrg } = useAuthStore.getState();
		if (org && params.org !== org.slug) {
			const other = availableOrgs.find((o) => o.slug === params.org);
			if (other) switchOrg(other.id);
			else throw redirect({ to: '/$org/dashboard', params: { org: org.slug }, replace: true, search: {} });
		}
	},
	component: Outlet,
});

const orgIndexRoute = createRoute({ getParentRoute: () => orgRoute, path: '/', beforeLoad: ({ params }) => { throw redirect({ to: '/$org/dashboard', params: { org: params.org }, search: {} }); } });

const dashboardRoute = createRoute({ getParentRoute: () => orgRoute, path: 'dashboard', validateSearch: (input: Partial<DashboardSearch> & SearchSchemaInput) => dashboardSearchSchema.parse(input), component: DashboardPage });

const inboxRoute = createRoute({ getParentRoute: () => orgRoute, path: 'inbox', validateSearch: (input: Partial<InboxSearch> & SearchSchemaInput) => inboxSearchSchema.parse(input), component: MyWorkPage });

const ticketsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'tickets', validateSearch: (input: Partial<TicketSearch> & SearchSchemaInput) => ticketSearchSchema.parse(input), component: TicketsPage });
const ticketNewRoute = createRoute({ getParentRoute: () => ticketsRoute, path: 'new', component: CreateTicketRoute });
const ticketDetailRoute = createRoute({ getParentRoute: () => ticketsRoute, path: '$key', component: TicketDetailRoute });

const projectsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'projects', validateSearch: (input: Partial<z.infer<typeof projectsSearchSchema>> & SearchSchemaInput) => projectsSearchSchema.parse(input), component: ProjectsPage });
const projectRoute = createRoute({ getParentRoute: () => orgRoute, path: 'projects/$projectKey', component: ProjectLayout });
const projectIndexRoute = createRoute({ getParentRoute: () => projectRoute, path: '/', beforeLoad: ({ params }) => { throw redirect({ to: '/$org/projects/$projectKey/overview', params, replace: true }); } });
const projectOverviewRoute = createRoute({ getParentRoute: () => projectRoute, path: 'overview', component: ProjectOverviewPage });
const projectListSchema = ticketSearchSchema.extend({ panel: z.string().optional() });
const projectListRoute = createRoute({ getParentRoute: () => projectRoute, path: 'list', validateSearch: (input: Partial<z.infer<typeof projectListSchema>> & SearchSchemaInput) => projectListSchema.parse(input), component: ProjectListPage });
const projectBoardRoute = createRoute({ getParentRoute: () => projectRoute, path: 'board', validateSearch: (input: z.infer<typeof boardSearchSchema> & SearchSchemaInput) => boardSearchSchema.parse(input), component: ProjectBoardPage });
const projectStubRoutes = (['backlog', 'sprints', 'roadmap', 'calendar', 'workload', 'settings'] as const).map((section) =>
	createRoute({ getParentRoute: () => projectRoute, path: section, component: () => <ProjectStubTab section={section} /> }),
);

const notificationsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'notifications', validateSearch: (input: Partial<z.infer<typeof notificationsSearchSchema>> & SearchSchemaInput) => notificationsSearchSchema.parse(input), component: NotificationsPage });

const usersRoute = createRoute({ getParentRoute: () => orgRoute, path: 'users', validateSearch: (input: Partial<z.infer<typeof teamSearchSchema>> & SearchSchemaInput) => teamSearchSchema.parse(input), component: TeamPage });
const rolesRoute = createRoute({ getParentRoute: () => orgRoute, path: 'users/roles', component: RolesPage });

const boardsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'boards', component: BoardsPage });
const clientsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'customers', validateSearch: (input: Partial<z.infer<typeof clientsSearchSchema>> & SearchSchemaInput) => clientsSearchSchema.parse(input), component: ClientsPage });
const clientDetailRoute = createRoute({ getParentRoute: () => orgRoute, path: 'customers/$clientId', validateSearch: (input: Partial<z.infer<typeof clientDetailSearchSchema>> & SearchSchemaInput) => clientDetailSearchSchema.parse(input), component: ClientDetailPage });
const assetsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'assets', validateSearch: (input: Partial<z.infer<typeof assetsSearchSchema>> & SearchSchemaInput) => assetsSearchSchema.parse(input), component: AssetsPage });
const visitsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'visits', validateSearch: (input: Partial<z.infer<typeof visitsSearchSchema>> & SearchSchemaInput) => visitsSearchSchema.parse(input), component: VisitsPage });
const kbRoute = createRoute({ getParentRoute: () => orgRoute, path: 'kb', validateSearch: (input: Partial<z.infer<typeof kbSearchSchema>> & SearchSchemaInput) => kbSearchSchema.parse(input), component: KbPage });
const kbArticleRoute = createRoute({ getParentRoute: () => orgRoute, path: 'kb/$slug', component: KbArticlePage });
const reportsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'reports', validateSearch: (input: Partial<z.infer<typeof reportsSearchSchema>> & SearchSchemaInput) => reportsSearchSchema.parse(input), component: ReportsPage });
const settingsIndexRoute = createRoute({ getParentRoute: () => orgRoute, path: 'settings', beforeLoad: ({ params }) => { throw redirect({ to: '/$org/settings/$section', params: { org: params.org, section: 'general' }, replace: true }); } });
const settingsRoute = createRoute({ getParentRoute: () => orgRoute, path: 'settings/$section', component: SettingsPage });

const stubSections = ['me'] as const;
const stubRoutes = stubSections.map((section) => createRoute({ getParentRoute: () => orgRoute, path: section, component: () => <PlaceholderPage section={section} /> }));

const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	loginOtpRoute,
	signupRoute,
	signupVerifyRoute,
	signupWorkspaceRoute,
	signupTeamRoute,
	forgotRoute,
	resetRoute,
	devLoginRoute,
	authedRoute.addChildren([
		orgRoute.addChildren([
			orgIndexRoute,
			dashboardRoute,
			inboxRoute,
			ticketsRoute.addChildren([ticketNewRoute, ticketDetailRoute]),
			projectsRoute,
			projectRoute.addChildren([projectIndexRoute, projectOverviewRoute, projectListRoute, projectBoardRoute, ...projectStubRoutes]),
			notificationsRoute,
			usersRoute,
			rolesRoute,
			boardsRoute,
			clientsRoute,
			clientDetailRoute,
			assetsRoute,
			visitsRoute,
			kbRoute,
			kbArticleRoute,
			reportsRoute,
			settingsIndexRoute,
			settingsRoute,
			...stubRoutes,
		]),
	]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent', defaultPendingMs: 150, scrollRestoration: true });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
