package app.swgc.roomchats;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.view.Gravity;
import org.json.JSONObject;
import org.json.JSONArray;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 401;
    private static final String HOME_URL = "https://scratch-would-global-chat.vercel.app/";
    private static final String CURRENT_VERSION = BuildConfig.VERSION_NAME;
    private static final String RELEASES_API = "https://api.github.com/repos/FeaturedPr0ject/scratch-would-global-chat/releases/latest";
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(12, 12, 16));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(12, 12, 16));
        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(12, 12, 16));
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        TextView menu = new TextView(this);
        menu.setText("⋮");
        menu.setTextColor(android.graphics.Color.WHITE);
        menu.setTextSize(25);
        menu.setGravity(Gravity.CENTER);
        menu.setBackgroundColor(android.graphics.Color.rgb(35, 35, 43));
        FrameLayout.LayoutParams menuParams = new FrameLayout.LayoutParams(dp(42), dp(42), Gravity.TOP | Gravity.END);
        menuParams.setMargins(0, dp(8), dp(8), 0);
        root.addView(menu, menuParams);
        menu.setOnClickListener(v -> showAppMenu());
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme();
                String host = uri.getHost() == null ? "" : uri.getHost();
                if ("https".equalsIgnoreCase(scheme) &&
                    (host.equals("scratch-would-global-chat.vercel.app") || host.endsWith(".vercel.app"))) {
                    return false;
                }
                if ("https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException ignored) {
                        Toast.makeText(MainActivity.this, "No app can open this link", Toast.LENGTH_SHORT).show();
                    }
                    return true;
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = callback;
                Intent intent;
                try {
                    intent = params.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException exception) {
                    fileChooserCallback = null;
                    Toast.makeText(MainActivity.this, "No file picker available", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                request.addRequestHeader("User-Agent", userAgent);
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                request.setDescription("Downloading from SWGC");
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                    URLUtil.guessFileName(url, contentDisposition, mimeType));
                request.setAllowedOverMetered(true);
                request.setAllowedOverRoaming(false);
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
                Toast.makeText(this, "Download started", Toast.LENGTH_SHORT).show();
            } catch (Exception exception) {
                Toast.makeText(this, "Could not start download", Toast.LENGTH_SHORT).show();
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(HOME_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void showAppMenu() {
        String[] items = {"Check for updates", "Reload SWGC", "App version " + CURRENT_VERSION};
        new AlertDialog.Builder(this).setTitle("SWGC Android").setItems(items, (dialog, which) -> {
            if (which == 0) checkForUpdates();
            else if (which == 1 && webView != null) webView.reload();
            else if (which == 2) new AlertDialog.Builder(this).setMessage("SWGC Android " + CURRENT_VERSION).setPositiveButton("OK", null).show();
        }).setNegativeButton("Close", null).show();
    }

    private void checkForUpdates() {
        Toast.makeText(this, "Checking for updates...", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(RELEASES_API).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                if (connection.getResponseCode() != 200) throw new Exception("No release");
                java.io.InputStream input = connection.getInputStream();
                java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                input.close();
                JSONObject release = new JSONObject(output.toString("UTF-8"));
                String tag = release.optString("tag_name", "").replaceFirst("^[vV]", "");
                JSONArray assets = release.optJSONArray("assets");
                String apkUrl = null;
                if (assets != null) for (int i = 0; i < assets.length(); i++) {
                    JSONObject asset = assets.getJSONObject(i);
                    if (asset.optString("name", "").toLowerCase().endsWith(".apk")) { apkUrl = asset.optString("browser_download_url", null); break; }
                }
                String finalApkUrl = apkUrl;
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (tag.isEmpty() || tag.equals(CURRENT_VERSION)) {
                        new AlertDialog.Builder(this).setTitle("SWGC Android").setMessage("You are using version " + CURRENT_VERSION + ". No newer release found.").setPositiveButton("OK", null).show();
                    } else {
                        AlertDialog.Builder dialog = new AlertDialog.Builder(this).setTitle("Update available").setMessage("New version: " + tag + "\\nCurrent version: " + CURRENT_VERSION).setNegativeButton("Later", null);
                        if (finalApkUrl != null && finalApkUrl.startsWith("https://")) dialog.setPositiveButton("Download APK", (d, w) -> downloadUpdate(finalApkUrl));
                        else dialog.setPositiveButton("View releases", (d, w) -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/FeaturedPr0ject/scratch-would-global-chat/releases"))));
                        dialog.show();
                    }
                });
            } catch (Exception exception) {
                new Handler(Looper.getMainLooper()).post(() -> new AlertDialog.Builder(this).setTitle("Update check failed").setMessage("No GitHub release was found, or the network request failed.").setPositiveButton("OK", null).show());
            } finally { if (connection != null) connection.disconnect(); }
        }).start();
    }

    private void downloadUpdate(String url) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("SWGC Android update");
            request.setDescription("Downloading APK update");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "SWGC-Android-update.apk");
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            Toast.makeText(this, "APK downloading. Open the download notification to install.", Toast.LENGTH_LONG).show();
        } catch (Exception exception) { Toast.makeText(this, "Could not download update", Toast.LENGTH_SHORT).show(); }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileChooserCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileChooserCallback.onReceiveValue(results);
            fileChooserCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
