import { Location, window, workspace } from 'vscode';
import { Finder } from './finder';
import { OpenDirection, getClosestMatch, getSelectedText, hideStatusMessage, showResult, showStatusMessage } from './utils';

export class Commands {

    finder = new Finder();

    public async switch(openDirection: OpenDirection = OpenDirection.Active) {
        if (!this.currentDocument) {
            return;
        }

        let result = undefined;
        const text = this.currentDocument.getText();
        const isJs = this.currentDocument.fileName.endsWith(".js");
        const templateName = this.getTemplateName(text, isJs);

        if (templateName && isJs) {
            result = await this.findTemplate(templateName);
        } else if (templateName) {
            result = await this.findComponentFromTemplateName(templateName);
        }

        if (result !== undefined) {
            showResult(result, openDirection);
        } else if (isJs) {
            window.showWarningMessage(`Could not find a template for current component`);
        } else {
            window.showWarningMessage(`Could not find a component for current template`);
        }
    }

    public async findComponentCommand() {
        const currentWord = getSelectedText();
        if (!currentWord) {
            return;
        }

        showStatusMessage(`Searching for component "${currentWord}"`);
        const result = await this.findComponent(currentWord);
        if (result) {
            showResult(result);
        } else {
            window.showWarningMessage(`Could not find a component for "${currentWord}"`);
        }
        hideStatusMessage();
    }

    public async findTemplateCommand() {
        const currentWord = getSelectedText(/[\w.-]+/);
        if (!currentWord) {
            return;
        }

        showStatusMessage(`Searching for template "${currentWord}"`);
        const result = await this.findTemplate(currentWord);
        if (result) {
            showResult(result);
        } else {
            window.showWarningMessage(`Could not find a template for "${currentWord}"`);
        }
        hideStatusMessage();
    }

    public async findComponent(componentName: string): Promise<Location | undefined> {
        if (componentName.toLowerCase() === componentName || componentName.includes(".") || componentName.includes("-")) {
            return;
        }

        const query = this.buildQuery(`class\\s+`, componentName, `\\s+extends`);
        return await this.finder.find(componentName, query, "js");
    }

    public async findTemplate(templateName: string): Promise<Location | undefined> {
        const isComponentName = templateName.match(/^[A-Z][a-zA-Z0-9_]*$/);

        if (isComponentName) {
            const componentResult = await this.findComponent(templateName);
            if (!componentResult) {
                return;
            } else {
                const text = (await workspace.openTextDocument(componentResult.uri)).getText();
                const foundTemplateName = this.getTemplateName(text, true);
                if (foundTemplateName) {
                    templateName = foundTemplateName;
                } else {
                    return;
                }
            }
        }

        const query = this.buildQuery(`t-name="`, templateName, `"`);
        return await this.finder.find(templateName, query, "xml");
    }

    private findComponentFromTemplateName(templateName: string): Promise<Location | undefined> {
        const query = this.buildQuery(`template\\s*=\\s*["']`, templateName, `["']`);
        return this.finder.find(templateName, query, "js");
    }

    private getTemplateName(str: string, isJsFile: boolean): string | undefined {
        if (isJsFile) {
            return getClosestMatch(str, /template\s*=\s*["']([a-zA-Z0-9_\-\.]+)["']/g, +1);
        } else {
            return getClosestMatch(str, /t-name="([a-zA-Z0-9_\-\.]+)"/g);
        }
    }

    private get currentDocument() {
        return window.activeTextEditor?.document;
    }

    private buildQuery(
        prefix: string,
        content: string,
        postfix: string,
    ): string {
        return `(?<=${prefix})(${content})(?=${postfix})`;
    }
}

