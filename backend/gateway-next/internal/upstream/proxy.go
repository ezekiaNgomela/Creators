package upstream

import (
	"net/http"
	"net/http/httputil"
	"net/url"
)

func NewProxy(service Service) (*httputil.ReverseProxy, error) {
	target, err := url.Parse(service.BaseURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	defaultDirector := proxy.Director

	proxy.Director = func(req *http.Request) {
		defaultDirector(req)
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", req.Host)
		req.Header.Set("X-Forwarded-Proto", target.Scheme)
	}

	proxy.ErrorHandler = func(rw http.ResponseWriter, _ *http.Request, proxyErr error) {
		http.Error(rw, proxyErr.Error(), http.StatusBadGateway)
	}

	return proxy, nil
}
