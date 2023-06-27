import { init } from '../serverless.js';

export const handler = init({
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["architect.png","cover_seo.png","cover_seo_2.png","crazy_artist.png","fashion_designer.png","favicon.ico","graphic_designer.png","graphic_novel_artist.png","movie_concept_artist.png","painter.png","photographer.png","street_photographer.png","weight_master.png"]),
	mimeTypes: {".png":"image/png",".ico":"image/vnd.microsoft.icon"},
	_: {
		client: {"start":"_app/immutable/entry/start.806bc265.js","app":"_app/immutable/entry/app.9667353d.js","imports":["_app/immutable/entry/start.806bc265.js","_app/immutable/chunks/index.f9843ce4.js","_app/immutable/chunks/singletons.2a00d2da.js","_app/immutable/chunks/index.7e6ce692.js","_app/immutable/chunks/control.f5b05b5f.js","_app/immutable/entry/app.9667353d.js","_app/immutable/chunks/index.f9843ce4.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			() => import('../server/nodes/0.js'),
			() => import('../server/nodes/1.js'),
			() => import('../server/nodes/2.js')
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/generate-idea",
				pattern: /^\/api\/generate-idea\/?$/,
				params: [],
				page: null,
				endpoint: () => import('../server/entries/endpoints/api/generate-idea/_server.js')
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
});
