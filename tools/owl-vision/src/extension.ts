import * as vscode from 'vscode';
import { Commands } from './commands';
import { ComponentDefinitionProvider } from './definiton_providers';
import { OpenDirection } from './utils';

export async function activate(context: vscode.ExtensionContext) {
    const commands = new Commands();

    context.subscriptions.push(vscode.commands.registerCommand('owl-vision.switch', () => commands.switch()));
    context.subscriptions.push(vscode.commands.registerCommand('owl-vision.switch-besides', () => commands.switch(OpenDirection.Besides)));
    context.subscriptions.push(vscode.commands.registerCommand('owl-vision.switch-below', () => commands.switch(OpenDirection.Below)));
    context.subscriptions.push(vscode.commands.registerCommand('owl-vision.find-component', () => commands.findComponentCommand()));
    context.subscriptions.push(vscode.commands.registerCommand('owl-vision.find-template', () => commands.findTemplateCommand()));

    const componentDefProvider = new ComponentDefinitionProvider(commands);
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ language: 'xml' }, componentDefProvider));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ language: 'javascript' }, componentDefProvider));
}

export function deactivate() { }
