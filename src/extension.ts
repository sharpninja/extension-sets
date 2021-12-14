import { readFileSync } from "fs";
import * as path from 'path';
import * as vscode from 'vscode';

var logger = vscode.window.createOutputChannel("Extension Sets");


export enum Keywords {
	Language = 'Language',
	Dependency = 'Dependency',
	Pattern = 'Pattern'
}

type Language = {
	__type: Keywords.Language;
	Value: string;
};

type Dependency = {
	__type: Keywords.Dependency;
	Value: string;
};

type Pattern = {
	__type: Keywords.Pattern;
	Value: string;
};

export type ExtensionFilter = {
	__type: Keywords;
	Data: Language | Dependency | Pattern;
};

export class ExtensionSetsCommands {
	Context: vscode.ExtensionContext;
	WebViewPanel: vscode.WebviewPanel;
	WebView: vscode.Webview;
	RootUri: vscode.Uri;
	IndexUri: vscode.Uri;
	AllExtensions: Array<vscode.Extension<any>> = [];
	FilteredExtensions: Array<vscode.Extension<any>> = [];
	EsLogger: vscode.OutputChannel; // = ExtensionSetHelpers.ExtensionLogger;
	SelectedItem: vscode.Extension<any> | undefined;

	Root(): string { return this.RootUri.fsPath; }
	Index(): string { return this.IndexUri.fsPath; }

	GetAllExtensions(): vscode.Extension<any>[] {
		const extensions = vscode.extensions.all;
		for (const ex of extensions) {
			this.AllExtensions.push(ex);
		}

		return this.AllExtensions;
	};

	OpenWebView(): void {
		this.EsLogger.appendLine("webView already initialized. Activating.");
		this.WebViewPanel.reveal(vscode.ViewColumn.One, false);
	};

	RequestByUri(uri: string): string | null {
		let result = uri;
		const path = vscode.Uri.joinPath(this.RootUri, uri);
		result = readFileSync(path.fsPath).toString();
		return result;
	};

	GetHttpRequest(uri: string): string | null | void {
		this.EsLogger.appendLine(`Requesting file by uri for [${uri}]`);
		return this.RequestUri(uri);
	}

	RequestUri(uri: string): string | null | void {
		const message = `Get Extension Sets for uri: [${uri}]`;
		this.EsLogger.appendLine(message);
		vscode.window.showInformationMessage(message);
	};

	SetLanguage(language: string): string | null | void {
		const message = `Get Extension Sets for language: [${language}]`;
		this.EsLogger.appendLine(message);
		vscode.window.showInformationMessage(message);
	};
	constructor(rootUri: vscode.Uri, indexUri: vscode.Uri, context: vscode.ExtensionContext, log: vscode.OutputChannel) {
		this.Context = context;
		this.EsLogger = log;
		this.RootUri = rootUri;
		this.IndexUri = indexUri;
		this.WebViewPanel = vscode.window.createWebviewPanel(
			"extensionSertPanel",
			"Extension Sets",
			vscode.ViewColumn.One,
			{
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
		);
		this.WebView = this.WebViewPanel.webview;

		this.WebView.options = {
			enableScripts: true,
			enableCommandUris: true,
			localResourceRoots: [this.RootUri]
		};

		this.AllExtensions = this.GetAllExtensions();
		this.FilteredExtensions = this.AllExtensions;
	};

	Initialize(): void {
		let html: string = readFileSync(this.Index()).toString();
		const match: RegExpMatchArray | null = html.match(/\$\{webview\.cspSource\}/);

		let isMatch: boolean = (match?.length ?? 0) > 0;

		while (isMatch) {
			html = html.replace(/\$\{webview\.cspSource\}/, this.Root());
		}

		this.WebView.html = html;

		this.WebView.onDidReceiveMessage
			((args) => {
				switch (args.command) {
					case "error":
					case 'log':
						const message: any = JSON.parse(args.text);
						if (message) {

							const toLog = message?.toString() ?? `<<${message === null ? "null" : "undefined"}>>`

							switch (args.command) {
								case "error":
									const errorMessage = message.name ?? "No message";
									const errorStack = message.stack ?? "No stack.";
									vscode.window.showErrorMessage(
										errorMessage,
										{ detail: errorStack } as vscode.MessageOptions);
									break;

								default:
									vscode.window.showInformationMessage(toLog);
									break;
							}
							this.EsLogger.appendLine(toLog);
						}
					case "item":
						this.SelectedItem = this.AllExtensions.find(extension => {
							return extension.id === args.text;
						});

						if (this.SelectedItem) {
							this.WebView.postMessage(
								JSON.stringify({
									response: args.command,
									data: this.SelectedItem
								}));
						}

						break;
					case 'find':
						const filters: ExtensionFilters = JSON.parse(args.text);
						const filtered = this.Find(filters);
						this.FilteredExtensions = filtered;
						break;

					case 'all':
						this.WebView.postMessage(
							JSON.stringify({
								response: "all",
								data: this.AllExtensions.map((ext) => { return ext.id;})
							}));
						break;

					default:
						break;
				}
			},
				null,
				this.Context.subscriptions
			);

		this.AllExtensions = this.GetAllExtensions();
		this.FilteredExtensions = this.AllExtensions;

		const message = "Extension Sets Initialized.";
		this.EsLogger.appendLine(message);
		vscode.window.showInformationMessage(message);

	};

	Find(filters: ExtensionFilters): vscode.Extension<any>[] {
	let result: vscode.Extension<any>[] = [];
	try {
		let filter: ExtensionFilter;
		let arr : any[] = [];
		const values = filters.forEach((f)=>{ arr.push(f) });
		for (filter of arr) {
			if (filter?.__type.toString() === Keywords.Language.toString()) {
				var byLanguage = this.AllExtensions.filter(
					(value) => {
						const compareTo = filter.Data.Value;
						const languages = value.packageJSON?.contributes?.languages;
						const grammars = value.packageJSON?.contributes?.grammars;
						let hasLanguage = false;
						let hasGrammar = false;
						try {
							if (languages instanceof Array) {
								for (const language of languages) {
									const hasAlias = language.aliases?.indexOf(compareTo) > -1;
									const hasExtension = language.extensions?.indexOf(compareTo) > -1;
									const hasId = language.id === compareTo;
									hasLanguage = hasAlias || hasExtension || hasId;
									if (hasLanguage) return true;
								}
							} else if(languages) {
								const hasAlias = languages.aliases?.indexOf(compareTo) > -1;
								const hasExtension = languages.extensions?.indexOf(compareTo) > -1;
								const hasId = languages.id === compareTo;
								hasLanguage = hasAlias || hasExtension || hasId;
								if (hasLanguage) return true;
							}
						} catch (error) {
							console.error(error);
						}

						try {
							if (grammars instanceof Array) {
								for (const grammar of grammars) {
									hasGrammar = grammar.language === compareTo;
									if (hasGrammar) return true;
								}
							} else if(grammars) {
								hasGrammar = grammars.language === compareTo;
								if (hasGrammar) return true;
							}
						} catch (error) {
							console.error(error);
						}
						return false;
					});

				result = result.concat(byLanguage);

				this.EsLogger.appendLine(`Found ${byLanguage.length} extensions by language.`);

				const results = byLanguage.map(ext => { return ext.id; }).join(', ');
				const foundMessage = `Found Language Extensions: ${results}.`;
				this.EsLogger.appendLine(foundMessage);
				vscode.window.showInformationMessage(foundMessage);
				this.WebView.postMessage(JSON.stringify({ response: "find", data: results }));
			}
		}

		const results = result.map(ext => { return ext.id; }).join(', ');
		const foundMessage = `Found These Extensions: ${results}.`;
		this.EsLogger.appendLine(`Found [${result.length}] extensions in total.`);
		vscode.window.showInformationMessage(foundMessage);
	} catch (error: any) {
		vscode.window.showErrorMessage(
			error.toString(),
			{ modal: true, detail: error } as vscode.MessageOptions,
			{ title: "Error" } as vscode.MessageItem);
	}
	return result;
};


	}

export class ExtensionFilters
	extends Map<Keywords, ExtensionFilter> {
	Language(filter: ExtensionFilter) {
		return filter.__type === Keywords.Language
			? super.get(filter.__type)
			: null;
	};
	Dependency(filter: ExtensionFilter) {
		return filter.__type === Keywords.Dependency
			? super.get(filter.__type)
			: null;
	};
	Pattern(filter: ExtensionFilter) {
		return filter.__type === Keywords.Pattern
			? super.get(filter.__type)
			: null;
	};
}

class ExtensionSetHelpers {
	Name: string;
	Log: vscode.OutputChannel;

	constructor(name: string, log: vscode.OutputChannel) {
		this.Name = name;
		this.Log = log;
	}
}


const EsHelper = new ExtensionSetHelpers("sharpninja.extensionsets", logger);

EsHelper.Log.appendLine(`Starting logger for ${EsHelper.Name}.`);

export async function activate(context: vscode.ExtensionContext) {
	logger.appendLine(`activate for ${EsHelper.Name}.`);

	const rootUri = vscode.Uri.joinPath(context.extensionUri, 'out');
	const indexUri = vscode.Uri.file(path.join(rootUri.fsPath, 'index.html'));
	const ext = new ExtensionSetsCommands(rootUri, indexUri, context, logger);
	ext.Initialize();

	const esLogger = ext.EsLogger;

	esLogger.appendLine(rootUri.fsPath);
	esLogger.appendLine(indexUri.fsPath);

	let commands: Array<any> = [];
	const FindCommand = 'find';
	const InitializeCommand = 'initialize';
	const OpenWebViewCommand = 'openwebview';
	const GetHttpRequestCommand = 'httprequest';
	const RequestUriCommand = 'uri';
	const SetLanguageCommand = 'setlanguage';

	commands.push([InitializeCommand, vscode.commands.registerCommand(InitializeCommand, ext.Initialize)]);
	commands.push([FindCommand, vscode.commands.registerCommand(FindCommand, ext.Find)]);
	commands.push([OpenWebViewCommand, vscode.commands.registerCommand(OpenWebViewCommand, ext.OpenWebView)]);
	commands.push([GetHttpRequestCommand, vscode.commands.registerCommand(GetHttpRequestCommand, ext.GetHttpRequest)]);
	commands.push([RequestUriCommand, vscode.commands.registerCommand(RequestUriCommand, ext.RequestUri)]);
	commands.push([SetLanguageCommand, vscode.commands.registerCommand(SetLanguageCommand, ext.SetLanguage)]);

	const commandNames = commands.map(cmd => { return cmd[0]; }).join(', ');

	esLogger.appendLine(`Registering (${commandNames})`);
	context.subscriptions.concat(commands.map((item=>{return item[1]})));
	const message = `Finished registering: [${commandNames}]`;
	esLogger.appendLine(message);
}

// this method is called when your extension is deactivated
export function deactivate() {
	EsHelper.Log.appendLine(`deactivate for ${EsHelper.Name}.`);
}
