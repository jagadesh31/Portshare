package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var ServerURL string

var rootCmd = &cobra.Command{
	Use:   "portshare",
	Short: "PortShare CLI to expose local ports to the internet",
	Long:  `PortShare CLI allows you to expose local web servers to the internet using PortShare tunnels.`,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&ServerURL, "server", "s", "http://localhost:9080", "PortShare server URL")
}
