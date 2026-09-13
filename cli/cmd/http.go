package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"portshare/config"
	"portshare/tunnel"

	"github.com/spf13/cobra"
)

var httpSubdomain string

var httpCmd = &cobra.Command{
	Use:   "http [port]",
	Short: "Start an HTTP tunnel to a local port",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		port, err := strconv.Atoi(args[0])
		if err != nil || port < 1 || port > 65535 {
			return fmt.Errorf("invalid port number: %s", args[0])
		}
		serverURL := NormalizedServerURL()

		fmt.Printf("Authenticating with %s...\n", serverURL)
		cfg, err := config.EnsureIdentity(serverURL)
		if err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}

		// Optional: claim a subdomain in the same run.
		if strings.TrimSpace(httpSubdomain) != "" {
			if err := claimSubdomain(serverURL, cfg.ClientID, strings.ToLower(strings.TrimSpace(httpSubdomain))); err != nil {
				return err
			}
			cfg.Subdomain = strings.ToLower(strings.TrimSpace(httpSubdomain))
			if err := config.SaveConfig(cfg); err != nil {
				return fmt.Errorf("failed to save config: %w", err)
			}
		}

		// Update port in server
		payload := map[string]interface{}{
			"clientId": cfg.ClientID,
			"port":     port,
		}
		payloadBytes, _ := json.Marshal(payload)
		req, _ := http.NewRequest(http.MethodPut, serverURL+"/client/port", bytes.NewReader(payloadBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := config.HTTPClient.Do(req)
		if err != nil {
			return fmt.Errorf("failed to update port on server: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
			return fmt.Errorf("failed to update port on server, status: %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
		}

		fmt.Printf("Client ID: %s\n", cfg.ClientID)
		if cfg.Subdomain != "" {
			fmt.Printf("Public URL: https://%s.%s\n", cfg.Subdomain, RootDomain)
		} else {
			fmt.Printf("Tip: claim a subdomain for a stable URL: portshare domain claim <name>\n")
		}
		if cfg.CustomDomain != "" {
			fmt.Printf("Custom Domain URL: https://%s\n", cfg.CustomDomain)
		}

		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()

		t := &tunnel.Tunnel{
			ServerURL: serverURL,
			ClientID:  cfg.ClientID,
			LocalPort: port,
		}
		if err := t.Start(ctx); err != nil {
			return err
		}
		fmt.Println("Tunnel stopped.")
		return nil
	},
}

func init() {
	httpCmd.Flags().StringVar(&httpSubdomain, "subdomain", "", "Claim this subdomain before starting the tunnel")
	rootCmd.AddCommand(httpCmd)
}
