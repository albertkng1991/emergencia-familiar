"""
CLI entry point: python -m backend.cli generate --topic "IA"
"""

import argparse
import json
import logging


def cmd_generate(args):
    from backend.packs.generator import generate_pack

    result = generate_pack(topic=args.topic, story_count=args.count)
    print(json.dumps(result, indent=2, ensure_ascii=False))


def cmd_serve(args):
    from backend.api.app import create_app

    app = create_app()
    app.run(host=args.host, port=args.port, debug=args.debug)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Daily Audio Digest")
    sub = parser.add_subparsers(dest="command", required=True)

    # generate
    gen = sub.add_parser("generate", help="Generate an audio pack")
    gen.add_argument("--topic", default="IA", help="Topic to research (default: IA)")
    gen.add_argument("--count", type=int, default=5, help="Number of stories (default: 5)")
    gen.set_defaults(func=cmd_generate)

    # serve
    srv = sub.add_parser("serve", help="Start the API server")
    srv.add_argument("--host", default="0.0.0.0")
    srv.add_argument("--port", type=int, default=5000)
    srv.add_argument("--debug", action="store_true")
    srv.set_defaults(func=cmd_serve)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
