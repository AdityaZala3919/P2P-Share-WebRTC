import sys
import argparse
import uvicorn
from app.core.config import settings

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run(host: str = settings.HOST, port: int = settings.PORT, reload: bool = True):
    """Run the CipherShare FastAPI backend server."""
    print(f"\n=======================================================")
    print(f"  Starting CipherShare Server")
    print(f"  URL: http://{host}:{port}")
    print(f"  Auto-reload: {reload}")
    print(f"=======================================================\n", flush=True)
    uvicorn.run("app.app:app", host=host, port=port, reload=reload)

def test():
    """Run automated integration tests."""
    import asyncio
    from test_suite import run_tests
    asyncio.run(run_tests())

def main():
    parser = argparse.ArgumentParser(
        description="CipherShare - E2E Encrypted P2P File Transfer & Vault Backend",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # 'run' subcommand
    run_parser = subparsers.add_parser("run", help="Start the FastAPI server")
    run_parser.add_argument("--host", default=settings.HOST, help="Host to bind server on")
    run_parser.add_argument("--port", "-p", type=int, default=settings.PORT, help="Port to bind server on")
    run_parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")

    # 'test' subcommand
    subparsers.add_parser("test", help="Run test suite")

    # Allow passing options directly to root without explicit 'run' subcommand (e.g. python main.py --port 8000)
    parser.add_argument("--host", default=settings.HOST, help="Host to bind server on")
    parser.add_argument("--port", "-p", type=int, default=settings.PORT, help="Port to bind server on")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")

    args, unknown = parser.parse_known_args()

    if args.command == "test":
        test()
    else:
        # Default or 'run' command
        run(
            host=args.host,
            port=args.port,
            reload=not args.no_reload,
        )

if __name__ == "__main__":
    main()
