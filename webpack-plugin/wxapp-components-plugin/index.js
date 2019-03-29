import {
	remove,
	readJson,
	existsSync,
	stat,
	readFile,
	readdir,
} from 'fs-extra';
import { resolve, dirname, relative, join, parse } from 'path';
import { optimize, LoaderTargetPlugin, JsonpTemplatePlugin } from 'webpack';
import { ConcatSource } from 'webpack-sources';
import globby from 'globby';
import { defaults, values, uniq } from 'lodash';
import MultiEntryPlugin from 'webpack/lib/MultiEntryPlugin';
import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';
import FunctionModulePlugin from 'webpack/lib/FunctionModulePlugin';
import NodeSourcePlugin from 'webpack/lib/node/NodeSourcePlugin';
import { K } from 'handlebars';

const { CommonsChunkPlugin } = optimize;

const deprecated = function deprecated(obj, key, adapter, explain) {
	if (deprecated.warned.has(key)) {
		return;
	}
	const val = obj[key];
	if (typeof val === 'undefined') {
		return;
	}
	deprecated.warned.add(key);
	adapter(val);
	console.warn('[WXAppPlugin]', explain);
};
deprecated.warned = new Set();

const stripExt = (path) => {
	const { dir, name } = parse(path);
	return join(dir, name);
};

const miniProgramTarget = (compiler) => {
	const { options } = compiler;
	compiler.apply(
		new JsonpTemplatePlugin(options.output),
		new FunctionModulePlugin(options.output),
		new NodeSourcePlugin(options.node),
		new LoaderTargetPlugin('web'),
	);
};

export const Targets = {
	Wechat(compiler) {
		return miniProgramTarget(compiler);
	},
	Alipay(compiler) {
		return miniProgramTarget(compiler);
	},
};

export default class WXAppPlugin {
	constructor(options = {}) {
		this.options = defaults(options || {}, {
			clear: true,
			include: [],
			exclude: [],
			dot: false, // Include `.dot` files
			extensions: ['.js'],
			commonModuleName: 'common.js',
			enforceTarget: true,
			assetsChunkName: '__assets_chunk_name__',
			// base: undefined,
		});

		deprecated(
			this.options,
			'scriptExt',
			(val) => this.options.extensions.unshift(val),
			'Option `scriptExt` is deprecated. Please use `extensions` instead',
		);

		deprecated(
			this.options,
			'forceTarge',
			(val) => (this.options.enforceTarget = val),
			'Option `forceTarge` is deprecated. Please use `enforceTarget` instead',
		);

		this.options.extensions = uniq([...this.options.extensions, '.js']);
		this.options.include = [].concat(this.options.include);
		this.options.exclude = [].concat(this.options.exclude);
		this.globalComponets = {};
	}

	apply(compiler) {
		const { clear } = this.options;
		let isFirst = true;

		this.enforceTarget(compiler);

		compiler.plugin(
			'run',
			this.try(async (compiler) => {
				await this.run(compiler);
			}),
		);

		compiler.plugin(
			'watch-run',
			this.try(async (compiler) => {
				await this.run(compiler.compiler);
			}),
		);

		compiler.plugin(
			'emit',
			this.try(async (compilation) => {
				if (clear && isFirst) {
					isFirst = false;
					await this.clear(compilation);
				}

				await this.toEmitTabBarIcons(compilation);

				// for (let k in compilation.assets) {
				// 	if (this.pageChildrenList.includes(k)) {
				// 		let jsonFile = k;
				// 		const json = await readJson(`${this.base}/${k}`);
				// 		const jsonPethDeep = jsonFile.split("/");
				// 		const jsonComponents = {};
				// 		for (let k in this.globalComponets) {
				// 			let beforePath = "/";
				// 			jsonComponents[k] = `${beforePath}${this.globalComponets[k]}`;
				// 		}
				// 		json.usingComponents = Object.assign(
				// 			json.usingComponents || {},
				// 			jsonComponents
				// 		);

				// 		const jsonText = JSON.stringify(json);
				// 		compilation.assets[k] = {
				// 			source: function() {
				// 				return jsonText;
				// 			},
				// 			size: function() {
				// 				return jsonText.length;
				// 			}
				// 		};
				// 	}
				// }
			}),
		);

		compiler.plugin(
			'after-emit',
			this.try(async (compilation) => {
				await this.toAddTabBarIconsDependencies(compilation);
			}),
		);
	}

	try = (handler) => async (arg, callback) => {
		try {
			await handler(arg);
			callback();
		}
		catch (err) {
			callback(err);
		}
	};

	enforceTarget(compiler) {
		const { enforceTarget } = this.options;
		const { options } = compiler;

		if (enforceTarget) {
			const { target } = options;
			if (target !== Targets.Wechat && target !== Targets.Alipay) {
				options.target = Targets.Wechat;
			}
			if (!options.node || options.node.global) {
				options.node = options.node || {};
				options.node.global = false;
			}
		}
	}

	getBase(compiler) {
		const { base, extensions } = this.options;
		if (base) {
			return resolve(base);
		}

		const { options: compilerOptions } = compiler;
		const { context, entry } = compilerOptions;

		const getEntryFromCompiler = () => {
			if (typeof entry === 'string') {
				return entry;
			}

			const extRegExpStr = extensions
				.map((ext) => ext.replace(/\./, '\\.'))
				.map((ext) => `(${ext})`)
				.join('|');

			const appJSRegExp = new RegExp(`\\bapp(${extRegExpStr})?$`);
			const findAppJS = (arr) => arr.find((path) => appJSRegExp.test(path));

			if (Array.isArray(entry)) {
				return findAppJS(entry);
			}
			if (typeof entry === 'object') {
				for (const key in entry) {
					if (!entry.hasOwnProperty(key)) {
						continue;
					}

					const val = entry[key];
					if (typeof val === 'string') {
						return val;
					}
					if (Array.isArray(val)) {
						return findAppJS(val);
					}
				}
			}
		};

		const entryFromCompiler = getEntryFromCompiler();

		if (entryFromCompiler) {
			return dirname(entryFromCompiler);
		}

		return context;
	}

	async getTabBarIcons(tabBar) {
		const tabBarIcons = new Set();
		const tabBarList = tabBar.list || [];
		for (const tabBarItem of tabBarList) {
			if (tabBarItem.iconPath) {
				tabBarIcons.add(tabBarItem.iconPath);
			}
			if (tabBarItem.selectedIconPath) {
				tabBarIcons.add(tabBarItem.selectedIconPath);
			}
		}

		this.tabBarIcons = tabBarIcons;
	}

	async toEmitTabBarIcons(compilation) {
		const emitIcons = [];
		this.tabBarIcons.forEach((iconPath) => {
			const iconSrc = resolve(this.base, iconPath);
			const toEmitIcon = async () => {
				const iconStat = await stat(iconSrc);
				const iconSource = await readFile(iconSrc);
				compilation.assets[iconPath] = {
					size: () => iconStat.size,
					source: () => iconSource,
				};
			};
			emitIcons.push(toEmitIcon());
		});
		await Promise.all(emitIcons);
	}

	toAddTabBarIconsDependencies(compilation) {
		const { fileDependencies } = compilation;
		this.tabBarIcons.forEach((iconPath) => {
			if (!~fileDependencies.indexOf(iconPath)) {
				fileDependencies.push(iconPath);
			}
		});
	}

	async getEntryResource() {
		const appJSONFile = resolve(this.base, 'app.json');
		const appJSON = await readJson(appJSONFile);
		const { pages = [], subPackages = [], tabBar = {} } = appJSON;
		this.globalComponets = appJSON.usingComponents || {};

		const components = new Set();

		for (const subPage of subPackages) {
			const pageRoot = subPage.root;
			for (let page of subPage.pages) {
				page = pageRoot + page;
				pages.push(page);
			}
		}
		this.pages = pages;
		for (const page of [...pages, ...values(this.globalComponets)]) {
			await this.getComponents(components, resolve(this.base, page));
		}

		this.getTabBarIcons(tabBar);
		const componentsJSON = Array.from(components).map((item) => {
			return `${item.replace(/\\/g, '/')}.json`;
		});
		const pagesJSON = pages.map((item) => {
			return `${item}.json`;
		});
		// 全局组件
		const globalComponets = [];
		for (let k in this.globalComponets) {
			globalComponets.push(this.globalComponets[k]);
		}
		this.pageChildrenList = [...pagesJSON, ...componentsJSON];

		if (appJSON.tabBar && appJSON.tabBar.custom) {
			globalComponets.push('custom-tab-bar/index');
		}
		return ['app', ...pages, ...Array.from(components), ...globalComponets];
	}

	async getComponents(components, instance) {
		const { usingComponents = {} } =
			(await readJson(`${instance}.json`).catch(
				(err) => err && err.code !== 'ENOENT' && console.error(err),
			)) || {};
		const componentBase = parse(instance).dir;
		for (const relativeComponent of values(usingComponents)) {
			if (relativeComponent.indexOf('plugin://') === 0) continue;
			const component = resolve(componentBase, relativeComponent);
			if (!components.has(component)) {
				components.add(relative(this.base, component));
				await this.getComponents(components, component);
			}
		}
	}

	getFullScriptPath(path) {
		const {
			base,
			options: { extensions },
		} = this;
		for (const ext of extensions) {
			const fullPath = resolve(base, path + ext);
			if (existsSync(fullPath)) {
				return fullPath;
			}
		}
	}

	async clear(compilation) {
		const { path } = compilation.options.output;
		await remove(path);
	}

	addEntries(compiler, entries, chunkName) {
		compiler.apply(new MultiEntryPlugin(this.base, entries, chunkName));
	}

	async compileAssets(compiler) {
		const {
			options: { include, exclude, dot, assetsChunkName, extensions },
			entryResources,
		} = this;
		compiler.plugin('compilation', (compilation) => {
			compilation.plugin('before-chunk-assets', () => {
				const assetsChunkIndex = compilation.chunks.findIndex(
					({ name }) => name === assetsChunkName,
				);
				if (assetsChunkIndex > -1) {
					compilation.chunks.splice(assetsChunkIndex, 1);
				}
			});
		});

		const patterns = entryResources
			.map((resource) => `${resource}.*`)
			.concat(include);

		const entries = await globby(patterns, {
			cwd: this.base,
			nodir: true,
			realpath: true,
			ignore: [...extensions.map((ext) => `**/*${ext}`), ...exclude],
			dot,
		});
		const extJsonPath = resolve(this.base, 'ext.json');
		if (existsSync(extJsonPath)) {
			entries.push(extJsonPath);
		}
		this.addEntries(compiler, entries, assetsChunkName);
	}

	getChunkResourceRegExp() {
		if (this._chunkResourceRegex) {
			return this._chunkResourceRegex;
		}

		const {
			options: { extensions },
		} = this;
		const exts = extensions
			.map((ext) => ext.replace(/\./g, '\\.'))
			.map((ext) => `(${ext}$)`)
			.join('|');
		return new RegExp(exts);
	}

	applyCommonsChunk(compiler) {
		const {
			options: { commonModuleName },
			entryResources,
		} = this;
		const scripts = entryResources.map(this.getFullScriptPath.bind(this));

		compiler.apply(
			new CommonsChunkPlugin({
				name: stripExt(commonModuleName),
				minChunks: ({ resource }) => {
					if (resource) {
						const regExp = this.getChunkResourceRegExp();
						return regExp.test(resource) && scripts.indexOf(resource) < 0;
					}
					return false;
				},
			}),
		);
	}

	addScriptEntry(compiler, entry, name) {
		compiler.plugin('make', (compilation, callback) => {
			const dep = SingleEntryPlugin.createDependency(entry, name);
			compilation.addEntry(this.base, dep, name, callback);
		});
	}

	compileScripts(compiler) {
		this.applyCommonsChunk(compiler);
		this.entryResources
			.filter((resource) => resource !== 'app' && resource !== undefined)
			.forEach((resource) => {
				const fullPath = this.getFullScriptPath(resource);
				if (!fullPath) {
					console.error(`${resource} is no exists`);
					throw new Error(`${resource} is no exists`);
				}
				this.addScriptEntry(compiler, fullPath, resource);
			});
	}

	toModifyTemplate(compilation) {
		const { commonModuleName } = this.options;
		const { target } = compilation.options;
		const commonChunkName = stripExt(commonModuleName);
		const globalVar = 'global';

		// inject chunk entries
		compilation.chunkTemplate.plugin('render', (core, { name }) => {
			if (this.entryResources.indexOf(name) >= 0) {
				const relativePath = relative(dirname(name), `./${commonModuleName}`);
				const posixPath = relativePath.replace(/\\/g, '/');
				let source = core.source();

				// eslint-disable-next-line max-len
				let injectContent = `; function webpackJsonp() { require("./${posixPath}"); ${globalVar}.webpackJsonp.apply(null, arguments); }`;

				if (source.indexOf(injectContent) < 0) {
					const pagePath = name.replace(/\\/g, '/');
					if (this.pages.includes(pagePath)) {
						const targetText = 'Page({';
						source = source.replace(targetText, function () {
							return `${targetText}route:'${pagePath}',`;
						});
					}
					const concatSource = new ConcatSource(source);
					concatSource.add(injectContent);
					return concatSource;
				}
			}
			return core;
		});

		// replace `window` to `global` in common chunk
		compilation.mainTemplate.plugin('bootstrap', (source, chunk) => {
			const windowRegExp = new RegExp('window', 'g');
			if (chunk.name === commonChunkName) {
				return source.replace(windowRegExp, globalVar);
			}
			return source;
		});

		// override `require.ensure()`
		compilation.mainTemplate.plugin(
			'require-ensure',
			() => 'throw new Error("Not chunk loading available");',
		);
	}

	async run(compiler) {
		this.base = this.getBase(compiler);
		this.entryResources = await this.getEntryResource();
		compiler.plugin('compilation', this.toModifyTemplate.bind(this));
		this.compileScripts(compiler);
		await this.compileAssets(compiler);
	}
	async fileDisplay(filePath, callback) {
		// 根据文件路径读取文件，返回文件列表
		const files = await readdir(filePath);
		var blogList = [];
		if (files && files.length) {
			for (let filename of files) {
				const filedir = join(filePath, filename);
				// 根据文件路径获取文件信息，返回一个stat对象
				const stats = await stat(filedir);
				const isFile = stats.isFile(); // 是文件
				const isDir = stats.isDirectory(); // 是文件夹
				if (isFile) {
					if (filedir) {
						callback(filedir);
					}
				}
				if (isDir) {
					await this.fileDisplay(filedir, callback); // 递归，如果是文件夹，就继续遍历该文件夹下面的文件
				}
			}
		}
		return blogList;
	}
}
