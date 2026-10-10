package app.swgc.roomchats;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.Dialog;
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
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.LinearLayout;
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
        webView.addJavascriptInterface(new AndroidBridge(), "SWGCAndroid");

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

    private boolean isTrustedWebViewOrigin() {
        if (webView == null || webView.getUrl() == null) return false;
        Uri uri = Uri.parse(webView.getUrl());
        return "https".equalsIgnoreCase(uri.getScheme()) &&
            "scratch-would-global-chat.vercel.app".equalsIgnoreCase(uri.getHost());
    }

    private class AndroidBridge {
        @JavascriptInterface
        public String getCurrentVersion() {
            return isTrustedWebViewOrigin() ? CURRENT_VERSION : "";
        }

        @JavascriptInterface
        public void checkForUpdates() {
            if (isTrustedWebViewOrigin()) runOnUiThread(() -> MainActivity.this.checkForUpdates());
        }

        @JavascriptInterface
        public void reloadApp() {
            if (isTrustedWebViewOrigin()) runOnUiThread(() -> {
                if (webView != null) webView.reload();
            });
        }
    }

    private TextView dialogButton(Dialog dialog, String text, boolean primary, Runnable action) {
        TextView button = new TextView(this);
        button.setText(text);
        button.setTextSize(13);
        button.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        button.setGravity(Gravity.CENTER);
        button.setPadding(dp(16), dp(12), dp(16), dp(12));
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(primary ? Color.rgb(255, 173, 0) : Color.rgb(43, 43, 53));
        shape.setCornerRadius(dp(13));
        if (!primary) shape.setStroke(dp(1), Color.rgb(66, 66, 78));
        button.setBackground(shape);
        button.setTextColor(primary ? Color.rgb(24, 20, 12) : Color.WHITE);
        button.setOnClickListener(view -> {
            dialog.dismiss();
            if (action != null) action.run();
        });
        return button;
    }

    private void showModernDialog(String title, String message, String positiveText, Runnable positiveAction, String secondaryText, Runnable secondaryAction) {
        Dialog dialog = new Dialog(this);
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(22), dp(22), dp(22), dp(18));
        GradientDrawable cardBackground = new GradientDrawable();
        cardBackground.setColor(Color.rgb(22, 22, 29));
        cardBackground.setCornerRadius(dp(24));
        cardBackground.setStroke(dp(1), Color.rgb(55, 55, 68));
        card.setBackground(cardBackground);

        TextView eyebrow = new TextView(this);
        eyebrow.setText("SWGC  /  ANDROID");
        eyebrow.setTextSize(10);
        eyebrow.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        eyebrow.setTextColor(Color.rgb(255, 190, 52));
        card.addView(eyebrow);

        TextView titleView = new TextView(this);
        titleView.setText(title);
        titleView.setTextSize(21);
        titleView.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        titleView.setTextColor(Color.WHITE);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(-1, -2);
        titleParams.topMargin = dp(9);
        card.addView(titleView, titleParams);

        TextView messageView = new TextView(this);
        messageView.setText(message);
        messageView.setTextSize(14);
        messageView.setTextColor(Color.rgb(190, 190, 202));
        messageView.setLineSpacing(dp(3), 1.0f);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(-1, -2);
        messageParams.topMargin = dp(10);
        card.addView(messageView, messageParams);

        LinearLayout actions = new LinearLayout(this);
        actions.setGravity(Gravity.END);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setPadding(0, dp(20), 0, 0);
        if (secondaryText != null) {
            TextView secondary = dialogButton(dialog, secondaryText, false, secondaryAction);
            LinearLayout.LayoutParams secondaryParams = new LinearLayout.LayoutParams(-2, -2);
            secondaryParams.rightMargin = dp(8);
            actions.addView(secondary, secondaryParams);
        }
        actions.addView(dialogButton(dialog, positiveText, true, positiveAction), new LinearLayout.LayoutParams(-2, -2));
        card.addView(actions);
        dialog.setContentView(card);
        dialog.setCancelable(true);
        dialog.show();
        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.dimAmount = 0.68f;
            window.setAttributes(attributes);
            window.setLayout(Math.min(getResources().getDisplayMetrics().widthPixels - dp(36), dp(440)), -2);
        }
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
                        showModernDialog("You are up to date", "Installed version: " + CURRENT_VERSION + "\nNo newer release was found.", "Done", null, null, null);
                    } else {
                        String message = "New version: " + tag + "\nInstalled version: " + CURRENT_VERSION;
                        if (finalApkUrl != null && finalApkUrl.startsWith("https://")) {
                            showModernDialog("Update available", message, "Download APK", () -> downloadUpdate(finalApkUrl), "Later", null);
                        } else {
                            showModernDialog("Update available", message, "View releases", () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/FeaturedPr0ject/scratch-would-global-chat/releases"))), "Later", null);
                        }
                    }
                });
            } catch (Exception exception) {
                new Handler(Looper.getMainLooper()).post(() -> showModernDialog("Could not check updates", "No GitHub release was found, or the network request failed. Check your connection and try again.", "Got it", null, null, null));
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
