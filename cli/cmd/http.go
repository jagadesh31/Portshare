package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"portshare/config"
	"portshare/tunnel"

	"github.com/spf13/cobra"
)

var httpCmd = &cobra.Command{
	Use:   "http [port]",
	Short: "Start an HTTP tunnel to a local port",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		port, err := strconv.Atoi(args[0])
		if err != nil || port < 1 || port > 65535 {
			return fmt.Errorf("invalid port number: %s", args[0])
		}

		fmt.Printf("Authenticating with %s...\n", ServerURL)
		cfg, err := config.EnsureIdentity(ServerURL)
		if err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}

		// Update port in server
		payload := map[string]interface{}{
			"clientId": cfg.ClientID,
			"port":     port,
		}
		payloadBytes, _ := json.Marshal(payload)
		req, _ := http.NewRequest(http.MethodPut, ServerURL+"/client/port", bytes.NewReader(payloadBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("failed to update port on server: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("failed to update port on server, status: %d", resp.StatusCode)
		}

		fmt.Printf("Client ID: %s\n", cfg.ClientID)
		if cfg.Subdomain != "" {
			fmt.Printf("Subdomain URL: http://%s.portshare.local\n", cfg.Subdomain) // we don't know the root domain from client side easily, maybe just print the subdomain
		}
		if cfg.CustomDomain != "" {
			fmt.Printf("Custom Domain URL: https://%s\n", cfg.CustomDomain)
		}

		t := &tunnel.Tunnel{
			ServerURL: ServerURL,
			ClientID:  cfg.ClientID,
			LocalPort: port,
		}
		return t.Start()
	},
}

func init() {
	rootCmd.AddCommand(httpCmd)
}
