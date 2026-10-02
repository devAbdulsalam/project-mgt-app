import {
	createRootRoute,
	createRoute,
	createRouter,
	lazyRouteComponent,
	redirect,
	Outlet,
	type SearchSchemaInput,
} from '@tanstack/react-router';
import { boardsSearchSchema, type BoardsSearch } from '@/features/boards/model';
import { OrgLayout } from '@/features/team/OrgLayout';
import { z } from 'zod';
import { useAuthStore } from '@/shared/lib/auth-store';
import { NotFoundPage } from '@/features/system/NotFoundPage';
import { RouteFallback } from '@/features/system/RouteFallback';
import {
	ticketSearchSchema,
	type TicketSearch,
} from '@/features/tickets/model/filters';
import { inboxSearchSchema, type InboxSearch } from '@/features/inbox/model';
import {
	projectsSearchSchema,
	boardSearchSchema,
	calendarSearchSchema,
	workloadSearchSchema,
	type CalendarSearch,
	type WorkloadSearch,
} from '@/features/projects/model';
import { notificationsSearchSchema } from '@/features/notifications/model';
import { teamSearchSchema } from '@/features/team/model';
import {
	dashboardSearchSchema,
	type DashboardSearch,
} from '@/features/dashboard/model';
import {
	clientsSearchSchema,
	clientDetailSearchSchema,
} from '@/features/clients/model';
import { assetsSearchSchema } from '@/features/assets/model';
import { visitsSearchSchema } from '@/features/visits/model';
import {
	programDetailSearchSchema,
	programsSearchSchema,
} from '@/features/programs/model';
import { expensesSearchSchema } from '@/features/expenses/model';
import { kbSearchSchema } from '@/features/kb/model';
import { reportsSearchSchema } from '@/features/reports/model';
import { profileSearchSchema } from '@/features/profile/model';
import {
	usersSearchSchema,
	orgsSearchSchema,
	auditSearchSchema,
	type UsersSearch,
	type OrgsSearch,
	type AuditSearch,
} from '@/features/console/model';

// Route-level code splitting: each page is its own chunk.
const LandingPage = lazyRouteComponent(
	() => import('@/features/marketing/pages/LandingPage'),
	'LandingPage',
);
const LoginPage = lazyRouteComponent(
	() => import('@/features/auth/pages/LoginPage'),
	'LoginPage',
);
const LoginOtpPage = lazyRouteComponent(
	() => import('@/features/auth/pages/LoginOtpPage'),
	'LoginOtpPage',
);
const SignupPage = lazyRouteComponent(
	() => import('@/features/auth/pages/SignupPage'),
	'SignupPage',
);
const SignupVerifyPage = lazyRouteComponent(
	() => import('@/features/auth/pages/SignupVerifyPage'),
	'SignupVerifyPage',
);
const InvitationsPage = lazyRouteComponent(
	() => import('@/features/auth/pages/InvitationsPage'),
	'InvitationsPage',
);
const SignupWorkspacePage = lazyRouteComponent(
	() => import('@/features/auth/pages/SignupWorkspacePage'),
	'SignupWorkspacePage',
);
const SignupTeamPage = lazyRouteComponent(
	() => import('@/features/auth/pages/SignupTeamPage'),
	'SignupTeamPage',
);
const ForgotPasswordPage = lazyRouteComponent(
	() => import('@/features/auth/pages/ForgotPasswordPage'),
	'ForgotPasswordPage',
);
const ResetPasswordPage = lazyRouteComponent(
	() => import('@/features/auth/pages/ResetPasswordPage'),
	'ResetPasswordPage',
);
const DashboardPage = lazyRouteComponent(
	() => import('@/features/dashboard/pages/DashboardPage'),
	'DashboardPage',
);
const TicketsPage = lazyRouteComponent(
	() => import('@/features/tickets/pages/TicketsPage'),
	'TicketsPage',
);
const TicketDetailRoute = lazyRouteComponent(
	() => import('@/features/tickets/pages/TicketDetailRoute'),
	'TicketDetailRoute',
);
const CreateTicketRoute = lazyRouteComponent(
	() => import('@/features/tickets/pages/CreateTicketRoute'),
	'CreateTicketRoute',
);
const MyWorkPage = lazyRouteComponent(
	() => import('@/features/inbox/pages/MyWorkPage'),
	'MyWorkPage',
);
const ProjectsPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectsPage'),
	'ProjectsPage',
);
const ProjectLayout = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectLayout'),
	'ProjectLayout',
);
const ProjectOverviewPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectOverviewPage'),
	'ProjectOverviewPage',
);
const ProjectListPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectListPage'),
	'ProjectListPage',
);
const ProjectBoardPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectBoardPage'),
	'ProjectBoardPage',
);
const ProjectStubTab = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectStubTab'),
	'ProjectStubTab',
);
const ProjectCalendarPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectCalendarPage'),
	'ProjectCalendarPage',
);
const ProjectWorkloadPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectWorkloadPage'),
	'ProjectWorkloadPage',
);
const ProjectSettingsPage = lazyRouteComponent(
	() => import('@/features/projects/pages/ProjectSettingsPage'),
	'ProjectSettingsPage',
);
const NotificationsPage = lazyRouteComponent(
	() => import('@/features/notifications/pages/NotificationsPage'),
	'NotificationsPage',
);
const TeamPage = lazyRouteComponent(
	() => import('@/features/team/pages/TeamPage'),
	'TeamPage',
);
const RolesPage = lazyRouteComponent(
	() => import('@/features/team/pages/RolesPage'),
	'RolesPage',
);
const BoardsPage = lazyRouteComponent(
	() => import('@/features/boards/BoardsPage'),
	'BoardsPage',
);
const ClientsPage = lazyRouteComponent(
	() => import('@/features/clients/pages/ClientsPage'),
	'ClientsPage',
);
const ClientDetailPage = lazyRouteComponent(
	() => import('@/features/clients/pages/ClientDetailPage'),
	'ClientDetailPage',
);
const AssetsPage = lazyRouteComponent(
	() => import('@/features/assets/AssetsPage'),
	'AssetsPage',
);
const VisitsPage = lazyRouteComponent(
	() => import('@/features/visits/VisitsPage'),
	'VisitsPage',
);
const ProgramsPage = lazyRouteComponent(
	() => import('@/features/programs/pages/ProgramsPage'),
	'ProgramsPage',
);
const ProgramDetailPage = lazyRouteComponent(
	() => import('@/features/programs/pages/ProgramDetailPage'),
	'ProgramDetailPage',
);
const ExpensesPage = lazyRouteComponent(
	() => import('@/features/expenses/ExpensesPage'),
	'ExpensesPage',
);
const KbPage = lazyRouteComponent(
	() => import('@/features/kb/KbPages'),
	'KbPage',
);
const KbArticlePage = lazyRouteComponent(
	() => import('@/features/kb/KbPages'),
	'KbArticlePage',
);
const ReportsPage = lazyRouteComponent(
	() => import('@/features/reports/ReportsPage'),
	'ReportsPage',
);
const SettingsPage = lazyRouteComponent(
	() => import('@/features/settings/SettingsPage'),
	'SettingsPage',
);
const ProfilePage = lazyRouteComponent(
	() => import('@/features/profile/ProfilePage'),
	'ProfilePage',
);

// ---------- Platform console ----------
//
// Deliberately a sibling of `authedRoute`, not a child of it. The product's guard
// requires an org, and a platform operator is explicitly someone who may belong
// to no workspace at all — nesting the console under it would lock out exactly the
// people who most need the surface. The console has its own gate, in
// features/console/ConsoleLayout.tsx.

const ConsoleLayout = lazyRouteComponent(
	() => import('@/features/console/ConsoleLayout'),
	'ConsoleLayout',
);
const ConsoleSignInPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleSignInPage'),
	'ConsoleSignInPage',
);
const ConsoleOverviewPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleOverviewPage'),
	'ConsoleOverviewPage',
);
const ConsoleUsersPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleUsersPage'),
	'ConsoleUsersPage',
);
const ConsoleUserDetailPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleUserDetailPage'),
	'ConsoleUserDetailPage',
);
const ConsoleOrgsPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleOrgsPage'),
	'ConsoleOrgsPage',
);
const ConsoleOrgDetailPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleOrgDetailPage'),
	'ConsoleOrgDetailPage',
);
const ConsoleOrgCreatePage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleOrgCreatePage'),
	'ConsoleOrgCreatePage',
);
const ConsoleOperatorsPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleOperatorsPage'),
	'ConsoleOperatorsPage',
);
const ConsoleAuditPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleAuditPage'),
	'ConsoleAuditPage',
);
const ConsoleSecurityPage = lazyRouteComponent(
	() => import('@/features/console/pages/ConsoleSecurityPage'),
	'ConsoleSecurityPage',
);

const rootRoute = createRootRoute({
	component: Outlet,
	notFoundComponent: NotFoundPage,
	pendingComponent: RouteFallback,
});

const redirectSearch = z.object({ redirect: z.string().optional() });

// ---------- Public / auth ----------

// Public marketing landing page. Signed-in visitors can still read it; its
// sign-in and get-started links take them to their dashboard instead.
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: LandingPage,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	validateSearch: redirectSearch,
	beforeLoad: ({ search }) => {
		const { status, org } = useAuthStore.getState();
		if (status === 'authenticated' && org)
			throw redirect({
				to: search.redirect ?? '/$org/dashboard',
				params: { org: org.slug },
				search: {},
			});
	},
	component: LoginPage,
});
const loginOtpRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login/verify',
	validateSearch: redirectSearch,
	component: LoginOtpPage,
});
const signupRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/signup',
	beforeLoad: () => {
		const { status, org } = useAuthStore.getState();
		if (status === 'authenticated' && org)
			throw redirect({
				to: '/$org/dashboard',
				params: { org: org.slug },
				search: {},
			});
	},
	component: SignupPage,
});
const signupVerifyRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/signup/verify',
	component: SignupVerifyPage,
});
/**
 * Answering an invitation.
 *
 * Outside `authedRoute` on purpose: that guard needs an active workspace, and
 * the whole point of this screen is that there is not one yet. It checks the
 * session itself.
 */
const invitationsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/invitations',
	beforeLoad: ({ location }) => {
		const { status, org } = useAuthStore.getState();
		if (status !== 'authenticated')
			throw redirect({ to: '/login', search: { redirect: location.href } });
		// Already in a workspace: there is nothing to decide here. Invitations
		// that arrive later are answered from the workspace switcher.
		if (org) throw redirect({ to: '/$org/dashboard', params: { org: org.slug }, search: {} });
	},
	component: InvitationsPage,
});

const signupWorkspaceRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/signup/workspace',
	component: SignupWorkspacePage,
});
const signupTeamRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/signup/team',
	component: SignupTeamPage,
});
const forgotRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/forgot-password',
	component: ForgotPasswordPage,
});
const resetRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/reset-password',
	validateSearch: z.object({ token: z.string().optional() }),
	component: ResetPasswordPage,
});

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
	validateSearch: z.object({
		email: z.string().optional(),
		to: z.string().optional(),
		stage: z.enum(['otp', 'verify', 'workspace', 'team']).optional(),
	}),
	beforeLoad: async ({ search }) => {
		if (!import.meta.env.DEV) throw redirect({ to: '/login', search: {} });
		const store = useAuthStore.getState();
		if (
			search.stage === 'verify' ||
			search.stage === 'workspace' ||
			search.stage === 'team'
		) {
			store.updateSignup({
				firstName: 'Adaeze',
				lastName: 'Okonkwo',
				email: 'adaeze@kolanutsystems.ng',
				phone: '+234 803 555 0142',
				phoneVerified: search.stage !== 'verify',
				companyName: 'Kolanut Systems Ltd',
				slug: 'kolanut',
			});
			throw redirect({
				to: `/signup/${search.stage}` as '/signup/verify',
				replace: true,
			});
		}
		await store.login({
			email: search.email ?? 'adaeze@kolanutsystems.ng',
			password: 'password',
			remember: true,
		});
		if (search.stage === 'otp')
			throw redirect({ to: '/login/verify', search: {}, replace: true });
		const org = await store.verifyOtp('482913');
		if (!org) throw redirect({ to: '/invitations', replace: true });
		throw redirect({
			to: search.to ?? '/$org/dashboard',
			params: { org: org.slug },
			replace: true,
			search: {},
		});
	},
});

// ---------- Authenticated ----------

const authedRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: 'authed',
	beforeLoad: ({ location }) => {
		const { status, org } = useAuthStore.getState();
		if (status !== 'authenticated')
			throw redirect({ to: '/login', search: { redirect: location.href } });
		// Signed in, but nothing to sign in *to* yet. Sending them back to the
		// login form would be a loop — they are already authenticated. Someone
		// with an invitation waiting answers it; everyone else creates a
		// workspace. /invitations handles the empty case itself, so a stale
		// count cannot strand anyone.
		if (!org) {
			const { pendingInvitations } = useAuthStore.getState();
			throw redirect({ to: pendingInvitations > 0 ? '/invitations' : '/signup/workspace' });
		}
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
			else
				throw redirect({
					to: '/$org/dashboard',
					params: { org: org.slug },
					replace: true,
					search: {},
				});
		}
	},
	component: OrgLayout,
});

const orgIndexRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: '/',
	beforeLoad: ({ params }) => {
		throw redirect({
			to: '/$org/dashboard',
			params: { org: params.org },
			search: {},
		});
	},
});

const dashboardRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'dashboard',
	validateSearch: (input: Partial<DashboardSearch> & SearchSchemaInput) =>
		dashboardSearchSchema.parse(input),
	component: DashboardPage,
});

const inboxRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'inbox',
	validateSearch: (input: Partial<InboxSearch> & SearchSchemaInput) =>
		inboxSearchSchema.parse(input),
	component: MyWorkPage,
});

const ticketsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'tickets',
	validateSearch: (input: Partial<TicketSearch> & SearchSchemaInput) =>
		ticketSearchSchema.parse(input),
	component: TicketsPage,
});
const ticketNewRoute = createRoute({
	getParentRoute: () => ticketsRoute,
	path: 'new',
	component: CreateTicketRoute,
});
const ticketDetailRoute = createRoute({
	getParentRoute: () => ticketsRoute,
	path: '$key',
	component: TicketDetailRoute,
});

const projectsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'projects',
	validateSearch: (
		input: Partial<z.infer<typeof projectsSearchSchema>> & SearchSchemaInput,
	) => projectsSearchSchema.parse(input),
	component: ProjectsPage,
});
const projectRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'projects/$projectKey',
	component: ProjectLayout,
});
const projectIndexRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: '/',
	beforeLoad: ({ params }) => {
		throw redirect({
			to: '/$org/projects/$projectKey/overview',
			params,
			replace: true,
		});
	},
});
const projectOverviewRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'overview',
	component: ProjectOverviewPage,
});
const projectListSchema = ticketSearchSchema.extend({
	panel: z.string().optional(),
});
const projectListRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'list',
	validateSearch: (
		input: Partial<z.infer<typeof projectListSchema>> & SearchSchemaInput,
	) => projectListSchema.parse(input),
	component: ProjectListPage,
});
const projectBoardRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'board',
	validateSearch: (
		input: z.infer<typeof boardSearchSchema> & SearchSchemaInput,
	) => boardSearchSchema.parse(input),
	component: ProjectBoardPage,
});
const projectStubRoutes = (['backlog', 'sprints', 'roadmap'] as const).map(
	(section) =>
		createRoute({
			getParentRoute: () => projectRoute,
			path: section,
			component: () => <ProjectStubTab section={section} />,
		}),
);
const projectCalendarRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'calendar',
	validateSearch: (input: Partial<CalendarSearch> & SearchSchemaInput) =>
		calendarSearchSchema.parse(input),
	component: ProjectCalendarPage,
});
const projectWorkloadRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'workload',
	validateSearch: (input: Partial<WorkloadSearch> & SearchSchemaInput) =>
		workloadSearchSchema.parse(input),
	component: ProjectWorkloadPage,
});
const projectSettingsIndexRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'settings',
	beforeLoad: ({ params }) => {
		throw redirect({
			to: '/$org/projects/$projectKey/settings/$section',
			params: { ...params, section: 'general' },
			replace: true,
		});
	},
});
const projectSettingsRoute = createRoute({
	getParentRoute: () => projectRoute,
	path: 'settings/$section',
	component: ProjectSettingsPage,
});

const notificationsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'notifications',
	validateSearch: (
		input: Partial<z.infer<typeof notificationsSearchSchema>> &
			SearchSchemaInput,
	) => notificationsSearchSchema.parse(input),
	component: NotificationsPage,
});

const usersRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'users',
	validateSearch: (
		input: Partial<z.infer<typeof teamSearchSchema>> & SearchSchemaInput,
	) => teamSearchSchema.parse(input),
	component: TeamPage,
});
const rolesRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'users/roles',
	component: RolesPage,
});

const boardsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'boards',
	validateSearch: (input: Partial<BoardsSearch> & SearchSchemaInput) =>
		boardsSearchSchema.parse(input),
	component: BoardsPage,
});
const clientsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'customers',
	validateSearch: (
		input: Partial<z.infer<typeof clientsSearchSchema>> & SearchSchemaInput,
	) => clientsSearchSchema.parse(input),
	component: ClientsPage,
});
const clientDetailRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'customers/$clientId',
	validateSearch: (
		input: Partial<z.infer<typeof clientDetailSearchSchema>> &
			SearchSchemaInput,
	) => clientDetailSearchSchema.parse(input),
	component: ClientDetailPage,
});
const assetsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'assets',
	validateSearch: (
		input: Partial<z.infer<typeof assetsSearchSchema>> & SearchSchemaInput,
	) => assetsSearchSchema.parse(input),
	component: AssetsPage,
});
const visitsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'visits',
	validateSearch: (
		input: Partial<z.infer<typeof visitsSearchSchema>> & SearchSchemaInput,
	) => visitsSearchSchema.parse(input),
	component: VisitsPage,
});
const programsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'programs',
	validateSearch: (
		input: Partial<z.infer<typeof programsSearchSchema>> & SearchSchemaInput,
	) => programsSearchSchema.parse(input),
	component: ProgramsPage,
});
const programDetailRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'programs/$programKey',
	validateSearch: (
		input: Partial<z.infer<typeof programDetailSearchSchema>> &
			SearchSchemaInput,
	) => programDetailSearchSchema.parse(input),
	component: ProgramDetailPage,
});
const expensesRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'expenses',
	validateSearch: (
		input: Partial<z.infer<typeof expensesSearchSchema>> & SearchSchemaInput,
	) => expensesSearchSchema.parse(input),
	component: ExpensesPage,
});
const kbRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'kb',
	validateSearch: (
		input: Partial<z.infer<typeof kbSearchSchema>> & SearchSchemaInput,
	) => kbSearchSchema.parse(input),
	component: KbPage,
});
const kbArticleRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'kb/$slug',
	component: KbArticlePage,
});
const reportsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'reports',
	validateSearch: (
		input: Partial<z.infer<typeof reportsSearchSchema>> & SearchSchemaInput,
	) => reportsSearchSchema.parse(input),
	component: ReportsPage,
});
const settingsIndexRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'settings',
	beforeLoad: ({ params }) => {
		throw redirect({
			to: '/$org/settings/$section',
			params: { org: params.org, section: 'general' },
			replace: true,
		});
	},
});
const settingsRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'settings/$section',
	component: SettingsPage,
});

const profileRoute = createRoute({
	getParentRoute: () => orgRoute,
	path: 'me',
	validateSearch: (
		input: Partial<z.infer<typeof profileSearchSchema>> & SearchSchemaInput,
	) => profileSearchSchema.parse(input),
	component: ProfilePage,
});
const stubRoutes: ReturnType<typeof createRoute>[] = [];

// ---------- Platform console ----------
//
// The sign-in route sits outside the gate: a signed-in operator following a
// colleague's link to /console should not be shown a form, and an expired cookie
// should not land an operator on a layout that cannot render.
const consoleSignInRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/console/sign-in',
	validateSearch: z.object({}),
	component: ConsoleSignInPage,
});

const consoleRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/console',
	component: ConsoleLayout,
});

const consoleIndexRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: '/',
	beforeLoad: () => {
		throw redirect({ to: '/console/overview', search: {} });
	},
});
const consoleOverviewRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'overview',
	component: ConsoleOverviewPage,
});

// Search params are validated per route, so a shared URL is parsed rather than
// trusted — `?limit=9999` is a 422 from the server, and the schema turns it into
// the 100 the server caps at before the request is made.
const consoleUsersRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'users',
	validateSearch: (input: Partial<UsersSearch> & SearchSchemaInput) =>
		usersSearchSchema.parse(input),
	component: ConsoleUsersPage,
});
const consoleUserDetailRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'users/$userId',
	component: ConsoleUserDetailPage,
});

const consoleOrgsRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'workspaces',
	validateSearch: (input: Partial<OrgsSearch> & SearchSchemaInput) =>
		orgsSearchSchema.parse(input),
	component: ConsoleOrgsPage,
});
// Declared before $slug so /console/workspaces/new is not read as a slug.
const consoleOrgCreateRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'workspaces/new',
	component: ConsoleOrgCreatePage,
});
const consoleOrgDetailRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'workspaces/$slug',
	component: ConsoleOrgDetailPage,
});

const consoleOperatorsRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'operators',
	component: ConsoleOperatorsPage,
});
const consoleAuditRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'audit',
	validateSearch: (input: Partial<AuditSearch> & SearchSchemaInput) =>
		auditSearchSchema.parse(input),
	component: ConsoleAuditPage,
});
const consoleSecurityRoute = createRoute({
	getParentRoute: () => consoleRoute,
	path: 'security',
	validateSearch: z.object({}),
	component: ConsoleSecurityPage,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	loginOtpRoute,
	signupRoute,
	signupVerifyRoute,
	invitationsRoute,
	signupWorkspaceRoute,
	signupTeamRoute,
	forgotRoute,
	resetRoute,
	devLoginRoute,
	consoleSignInRoute,
	consoleRoute.addChildren([
		consoleIndexRoute,
		consoleOverviewRoute,
		consoleUsersRoute,
		consoleUserDetailRoute,
		consoleOrgsRoute,
		consoleOrgCreateRoute,
		consoleOrgDetailRoute,
		consoleOperatorsRoute,
		consoleAuditRoute,
		consoleSecurityRoute,
	]),
	authedRoute.addChildren([
		orgRoute.addChildren([
			orgIndexRoute,
			dashboardRoute,
			inboxRoute,
			ticketsRoute.addChildren([ticketNewRoute, ticketDetailRoute]),
			projectsRoute,
			projectRoute.addChildren([
				projectIndexRoute,
				projectOverviewRoute,
				projectListRoute,
				projectBoardRoute,
				projectCalendarRoute,
				projectWorkloadRoute,
				projectSettingsIndexRoute,
				projectSettingsRoute,
				...projectStubRoutes,
			]),
			notificationsRoute,
			usersRoute,
			rolesRoute,
			boardsRoute,
			clientsRoute,
			clientDetailRoute,
			assetsRoute,
			visitsRoute,
			programsRoute,
			programDetailRoute,
			expensesRoute,
			kbRoute,
			kbArticleRoute,
			reportsRoute,
			settingsIndexRoute,
			settingsRoute,
			profileRoute,
			...stubRoutes,
		]),
	]),
]);

export const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	defaultPendingMs: 150,
	scrollRestoration: true,
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
