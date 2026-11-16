package com.nutriscan.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.provider.MediaStore;
import android.text.InputType;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import androidx.core.content.FileProvider;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import org.json.JSONObject;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int PHOTO_REQUEST = 1;

    private WebView webView;
    private URI server;
    private ValueCallback<Uri[]> pendingPhoto;
    private Uri cameraPhoto;
    private File cameraFile;
    private boolean showingError;
    private boolean resetHistory;
    private CancellationSignal googleRequest;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " NutriScanAndroid NutriScanNativeGoogle");
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url = request.getUrl();
                if (sameServer(url)) {
                    if (!"/android/google-sign-in".equals(url.getPath())) return false;
                    if ("https".equals(url.getScheme())) signInWithGoogle(url);
                    return true;
                }
                if ("https".equals(url.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (ActivityNotFoundException ignored) {
                        // The installed device has no handler for external links.
                    }
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showConnectionError();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse error) {
                if (request.isForMainFrame()) showConnectionError();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (resetHistory && sameServer(Uri.parse(url))) {
                    view.clearHistory();
                    resetHistory = false;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!sameServer(Uri.parse(view.getUrl()))) return false;
                if (pendingPhoto != null) pendingPhoto.onReceiveValue(null);
                pendingPhoto = callback;
                cleanupCamera();
                if (params.isCaptureEnabled() && openCamera()) return true;
                try {
                    startActivityForResult(params.createIntent(), PHOTO_REQUEST);
                } catch (ActivityNotFoundException error) {
                    finishPhoto(null);
                }
                return true;
            }
        });

        setContentView(webView);
        String saved = getPreferences(MODE_PRIVATE).getString("server", BuildConfig.DEFAULT_SERVER);
        try {
            connect(parseOrigin(saved));
        } catch (URISyntaxException error) {
            connect(URI.create(BuildConfig.DEFAULT_SERVER));
        }
    }

    private void signInWithGoogle(Uri url) {
        String clientId = url.getQueryParameter("client_id");
        String nonce = url.getQueryParameter("nonce");
        if (googleRequest != null || clientId == null || nonce == null
            || !clientId.matches("[A-Za-z0-9.-]+\\.apps\\.googleusercontent\\.com")
            || !nonce.matches("[A-Za-z0-9_-]{43}")) return;
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId)
            .setNonce(nonce).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(option).build();
        googleRequest = new CancellationSignal();
        CredentialManager.create(this).getCredentialAsync(this, request, googleRequest, this::runOnUiThread,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    try {
                        if (!(response.getCredential() instanceof CustomCredential)
                            || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(response.getCredential().getType())) {
                            completeGoogle(url, nonce, "", "Google returned an unsupported credential.");
                            return;
                        }
                        String token = GoogleIdTokenCredential.createFrom(response.getCredential().getData()).getIdToken();
                        completeGoogle(url, nonce, token, "");
                    } catch (Exception error) {
                        completeGoogle(url, nonce, "", "Couldn’t read your Google credential. Try again.");
                    }
                }

                @Override
                public void onError(GetCredentialException error) {
                    completeGoogle(url, nonce, "", error instanceof GetCredentialCancellationException
                        ? "Google sign-in was cancelled." : "Google sign-in couldn’t open. Check that Google Play services is available and try again.");
                }
            });
    }

    private void completeGoogle(Uri origin, String nonce, String token, String error) {
        googleRequest = null;
        if (isDestroyed() || !sameServer(origin) || webView.getUrl() == null
            || !sameServer(Uri.parse(webView.getUrl()))) return;
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('nutriscan:google', {detail:{nonce:"
            + JSONObject.quote(nonce) + ",token:" + JSONObject.quote(token) + ",error:" + JSONObject.quote(error) + "}}))", null);
    }

    private boolean sameServer(Uri url) {
        return server.getScheme().equalsIgnoreCase(url.getScheme())
            && server.getHost().equalsIgnoreCase(url.getHost())
            && effectivePort(server.getScheme(), server.getPort()) == effectivePort(url.getScheme(), url.getPort());
    }

    private static int effectivePort(String scheme, int port) {
        if (port >= 0) return port;
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private void connect(URI origin) {
        resetHistory = true;
        server = origin;
        getPreferences(MODE_PRIVATE).edit().putString("server", origin.toString()).apply();
        webView.stopLoading();
        webView.loadUrl(origin + "/");
    }

    private void showConnectionError() {
        if (showingError || isFinishing()) return;
        showingError = true;
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("Couldn’t open NutriScan")
            .setMessage("Check your connection and make sure the NutriScan server is running.")
            .setPositiveButton("Retry", (selected, which) -> connect(server))
            .setNeutralButton("Change server", (selected, which) -> showServerSettings())
            .create();
        dialog.setOnDismissListener(selected -> showingError = false);
        dialog.show();
    }

    private void showServerSettings() {
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setSingleLine(true);
        input.setText(server.toString());
        input.setSelectAllOnFocus(true);

        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("NutriScan server")
            .setMessage("Use an HTTPS server, or a private Wi-Fi address for local testing.")
            .setView(input)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Connect", null)
            .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
            try {
                URI origin = parseOrigin(input.getText().toString().trim());
                dialog.dismiss();
                connect(origin);
            } catch (URISyntaxException error) {
                input.setError("Enter a server address such as https://example.com or http://192.168.1.8:5000.");
            }
        }));
        dialog.show();
    }

    private static URI parseOrigin(String address) throws URISyntaxException {
        URI input = new URI(address);
        String host = input.getHost();
        String scheme = input.getScheme();
        if (host == null || scheme == null || input.getRawUserInfo() != null
            || input.getPort() == 0 || input.getPort() > 65535
            || input.getRawQuery() != null || input.getRawFragment() != null
            || (input.getPath() != null && !input.getPath().isEmpty() && !"/".equals(input.getPath()))
            || (!"https".equalsIgnoreCase(scheme) && !("http".equalsIgnoreCase(scheme) && isPrivateAddress(host)))) {
            throw new URISyntaxException(address, "Expected an HTTPS or private HTTP origin");
        }
        return new URI(scheme.toLowerCase(Locale.ROOT), null, host, input.getPort(), null, null, null);
    }

    private static boolean isPrivateAddress(String host) {
        if ("localhost".equalsIgnoreCase(host)) return true;
        String[] octets = host.split("\\.");
        if (octets.length != 4) return false;
        for (String octet : octets) {
            if (!octet.matches("[0-9]{1,3}") || Integer.parseInt(octet) > 255) return false;
        }
        int first = Integer.parseInt(octets[0]);
        int second = Integer.parseInt(octets[1]);
        return first == 10 || first == 127 || (first == 192 && second == 168)
            || (first == 172 && second >= 16 && second <= 31);
    }

    private boolean openCamera() {
        try {
            File directory = new File(getCacheDir(), "meal-photos");
            if (!directory.isDirectory() && !directory.mkdirs()) return false;
            cameraFile = File.createTempFile("meal-", ".jpg", directory);
            cameraPhoto = FileProvider.getUriForFile(this, getPackageName() + ".photos", cameraFile);
            Intent capture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            capture.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhoto);
            capture.setClipData(ClipData.newRawUri("Meal photo", cameraPhoto));
            capture.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(capture, PHOTO_REQUEST);
            return true;
        } catch (IOException | ActivityNotFoundException error) {
            cleanupCamera();
            return false;
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PHOTO_REQUEST) return;
        if (result == RESULT_OK && cameraPhoto != null && cameraFile.length() > 0) {
            finishPhoto(new Uri[] { cameraPhoto });
        } else {
            cleanupCamera();
            finishPhoto(WebChromeClient.FileChooserParams.parseResult(result, data));
        }
    }

    private void finishPhoto(Uri[] photos) {
        if (pendingPhoto != null) pendingPhoto.onReceiveValue(photos);
        pendingPhoto = null;
    }

    private void cleanupCamera() {
        if (cameraFile != null) cameraFile.delete();
        cameraFile = null;
        cameraPhoto = null;
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        new AlertDialog.Builder(this)
            .setTitle("NutriScan")
            .setItems(new String[] { "Change server", "Close app" }, (dialog, selection) -> {
                if (selection == 0) showServerSettings();
                else finish();
            }).show();
    }

    @Override
    protected void onDestroy() {
        if (googleRequest != null) googleRequest.cancel();
        finishPhoto(null);
        cleanupCamera();
        webView.destroy();
        super.onDestroy();
    }
}
