package com.client.spline

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import design.spline.runtime.SplineView
import com.client.R

@SuppressLint("ViewConstructor")
class SplineViewManager(private val reactContext: ReactApplicationContext)
    : SimpleViewManager<SplineView>() {

    override fun getName() = "RNSplineView"

    override fun createViewInstance(reactContext: ThemedReactContext): SplineView {
        val view = SplineView(reactContext)
        view.loadResource(R.raw.demo_1)
        return view
    }

    @ReactProp(name = "url")
    fun setUrl(view: SplineView, url: String?) {
        if (!url.isNullOrEmpty()) {
            view.loadUrl(url)
        }
    }
}
