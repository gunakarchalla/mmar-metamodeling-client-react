export class HelperService {
    async DataUrltoFile(url: string, filename: string, mimeType?: string): Promise<File> {
        if (url.startsWith('data:')) {
            const arr = url.split(','),
                mime = arr[0].match(/:(.*?);/)![1],
                bstr = atob(arr[arr.length - 1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const file = new File([u8arr], filename, { type: mime || mimeType });
            return Promise.resolve(file);
        }
        return fetch(url)
            .then(res => res.arrayBuffer())
            .then(buf => new File([buf], filename, { type: mimeType }));
    }

    // NOTE: original used node Buffer (polyfilled by webpack). Ported to a
    // browser-native base64 encode that yields the same (prefix-less) base64 string.
    async FiletoDataUrl(file: File): Promise<string> {
        const fileContent = await file.arrayBuffer();
        const bytes = new Uint8Array(fileContent);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}
