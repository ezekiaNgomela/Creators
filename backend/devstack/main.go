package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	gatewayapp "creators/backend/gateway-next/app"
	authapp "creators/backend/services/auth-service-next/app"
	postapp "creators/backend/services/post-service-next/app"
	streamapp "creators/backend/services/stream-service-next/app"
	subscriptionapp "creators/backend/services/subscription-service-next/app"
	walletapp "creators/backend/services/wallet-service-next/app"
	"github.com/joho/godotenv"
)

type serviceDefinition struct {
	name     string
	portEnv  string
	fallback string
	build    func() (http.Handler, func() error, error)
}

type runningService struct {
	name     string
	port     string
	server   *http.Server
	listener net.Listener
	close    func() error
}

func main() {
	log.SetFlags(0)

	if err := loadEnvFile(); err != nil {
		log.Printf("[warn] %v", err)
	}

	services := []serviceDefinition{
		{name: "auth-service-next", portEnv: "AUTH_SERVICE_PORT", fallback: "4001", build: authapp.New},
		{name: "subscription-service-next", portEnv: "SUBSCRIPTION_SERVICE_PORT", fallback: "18003", build: subscriptionapp.New},
		{name: "post-service-next", portEnv: "POST_SERVICE_PORT", fallback: "18005", build: postapp.New},
		{name: "stream-service-next", portEnv: "STREAM_SERVICE_PORT", fallback: "18006", build: streamapp.New},
		{name: "wallet-service-next", portEnv: "WALLET_SERVICE_PORT", fallback: "18007", build: walletapp.New},
		{name: "gateway-next", portEnv: "GATEWAY_PORT", fallback: "18000", build: gatewayapp.New},
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	running, errCh, err := startServices(services)
	if err != nil {
		log.Fatalf("[error] %v", err)
	}

	log.Printf("[ready] backend devstack is running")
	log.Printf("[hint] Press Ctrl+C to stop all backend services")

	var exitErr error

	select {
	case <-ctx.Done():
		log.Printf("[stop] shutdown requested")
	case err := <-errCh:
		exitErr = err
		log.Printf("[error] %v", err)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := shutdownServices(shutdownCtx, running); err != nil && exitErr == nil {
		exitErr = err
		log.Printf("[error] %v", err)
	}

	if exitErr != nil {
		os.Exit(1)
	}
}

func startServices(defs []serviceDefinition) ([]runningService, <-chan error, error) {
	errCh := make(chan error, len(defs))
	running := make([]runningService, 0, len(defs))

	for _, def := range defs {
		handler, closeFn, err := def.build()
		if err != nil {
			_ = shutdownServices(context.Background(), running)
			return nil, nil, fmt.Errorf("%s setup failed: %w", def.name, err)
		}

		port := envOrFallback(def.portEnv, def.fallback)
		listener, err := net.Listen("tcp", ":"+port)
		if err != nil {
			if closeFn != nil {
				_ = closeFn()
			}
			_ = shutdownServices(context.Background(), running)
			return nil, nil, fmt.Errorf("%s could not bind :%s: %w", def.name, port, err)
		}

		server := &http.Server{
			Addr:              ":" + port,
			Handler:           handler,
			ReadHeaderTimeout: 10 * time.Second,
		}

		current := runningService{
			name:     def.name,
			port:     port,
			server:   server,
			listener: listener,
			close:    closeFn,
		}
		running = append(running, current)

		go func(svc runningService) {
			if err := svc.server.Serve(svc.listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
				errCh <- fmt.Errorf("%s stopped unexpectedly: %w", svc.name, err)
			}
		}(current)

		log.Printf("[ready] %s listening on http://127.0.0.1:%s", def.name, port)
	}

	return running, errCh, nil
}

func shutdownServices(ctx context.Context, services []runningService) error {
	var shutdownErr error

	for index := len(services) - 1; index >= 0; index-- {
		service := services[index]
		if err := service.server.Shutdown(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) && shutdownErr == nil {
			shutdownErr = fmt.Errorf("%s shutdown failed: %w", service.name, err)
		}
		if service.close != nil {
			if err := service.close(); err != nil && shutdownErr == nil {
				shutdownErr = fmt.Errorf("%s cleanup failed: %w", service.name, err)
			}
		}
	}

	return shutdownErr
}

func loadEnvFile() error {
	cwd, err := os.Getwd()
	if err != nil {
		return err
	}

	dir := cwd
	for {
		candidate := filepath.Join(dir, ".env")
		if _, err := os.Stat(candidate); err == nil {
			return godotenv.Load(candidate)
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return fmt.Errorf("could not find .env from %s upward", cwd)
}

func envOrFallback(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
