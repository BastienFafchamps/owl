import path = require('path');
import { GlobPattern, Location, Range, Uri, window, workspace } from 'vscode';

export class Finder {

    finderCache = new Map<string, Uri>();

    public async find(
        name: string,
        searchQuery: string,
        fileType: "js" | "xml",
    ): Promise<Location | undefined> {
        const key = `${name}-${fileType}`;
        const cachedUri = this.finderCache.get(key);
        if (cachedUri) {
            const result = await this.findInFile(cachedUri, searchQuery);
            if (result) {
                return result;
            } else {
                this.finderCache.delete(key);
            }
        }

        const include = `{${workspace.getConfiguration().get(`owl-vision.include`)}, *.${fileType}}`;
        const exclude = `{${workspace.getConfiguration().get(`owl-vision.exclude`)}}`;
        const files = await this.getFiles(name, include, exclude);

        for (const file of files) {
            const result = await this.findInFile(file, searchQuery);
            if (result) {
                this.finderCache.set(key, result.uri);
                return result;
            }
        }
    }

    private async getFiles(
        searchQuery: string,
        include: GlobPattern,
        exclude: GlobPattern,
    ): Promise<Array<Uri>> {
        const files = await workspace.findFiles(include, exclude);
        const parts = searchQuery.split(".").flatMap(s => s.split(/(?=[A-Z])/)).map(s => s.toLowerCase());
        const currentDir = this.currentDocument ? path.dirname(this.currentDocument.uri.path) : "";

        const results = files.map(file => {
            const filepath = file.path.toLowerCase();
            let score = 0;
            if (path.dirname(filepath) === currentDir) {
                score += 99;
            }
            for (const part of parts) {
                if (filepath.includes(part)) {
                    score++;
                }
            }
            return { score, file };
        })
            .sort((a, b) => a.score > b.score ? -1 : 1)
            .slice(0, 25);

        return results.map(r => r.file);
    }

    private async findInFile(
        file: Uri,
        searchQuery: string,
    ): Promise<Location | undefined> {
        const document = await workspace.openTextDocument(file);
        const text = document.getText();
        const match = text.match(new RegExp(searchQuery));

        if (match) {
            const index = match.index || 0;
            return new Location(file, new Range(
                document.positionAt(index),
                document.positionAt(index)
            ));
        }
    }

    private get currentDocument() {
        return window.activeTextEditor?.document;
    }
}

